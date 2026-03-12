import fs from "node:fs/promises"
import path from "node:path"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

const APPLY = process.argv.includes("--apply")
const KIND_ARG = process.argv.find((arg) => arg.startsWith("--kind="))
const KIND_FILTER = KIND_ARG ? String(KIND_ARG.split("=")[1] ?? "").trim().toLowerCase() : ""

const normalizeHref = (value) => String(value ?? "").trim().toLowerCase()
const normalizeName = (value) => String(value ?? "").trim().toLowerCase()

const chooseKeeper = (offers) =>
  [...offers].sort((a, b) => {
    const aHasHref = Boolean(String(a.href ?? "").trim())
    const bHasHref = Boolean(String(b.href ?? "").trim())
    if (aHasHref !== bHasHref) return bHasHref ? 1 : -1
    const aCreated = a.createdAt instanceof Date ? a.createdAt.getTime() : 0
    const bCreated = b.createdAt instanceof Date ? b.createdAt.getTime() : 0
    if (aCreated !== bCreated) return aCreated - bCreated
    return String(a.id).localeCompare(String(b.id))
  })[0]

const buildDuplicateGroups = (offers) => {
  const groups = new Map()

  offers.forEach((offer) => {
    const kind = String(offer.kind ?? "").trim().toLowerCase()
    if (KIND_FILTER && kind !== KIND_FILTER) return
    const hrefKey = normalizeHref(offer.href)
    const nameKey = normalizeName(offer.name)
    if (!hrefKey && !nameKey) return
    const key = hrefKey ? `${kind}|href|${hrefKey}` : `${kind}|name|${nameKey}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(offer)
  })

  return Array.from(groups.entries())
    .map(([groupKey, entries]) => ({ groupKey, entries }))
    .filter((group) => group.entries.length > 1)
}

const upsertMergedPrice = async (tx, keeperId, loserId) => {
  const [keeper, loser] = await Promise.all([
    tx.eldoradoOfferPrice.findUnique({ where: { offerId: keeperId } }),
    tx.eldoradoOfferPrice.findUnique({ where: { offerId: loserId } }),
  ])
  if (!loser) return
  if (keeper) {
    await tx.eldoradoOfferPrice.update({
      where: { offerId: keeperId },
      data: {
        base: keeper.base ?? loser.base,
        percent: keeper.percent ?? loser.percent,
        result: keeper.result ?? loser.result,
      },
    })
    await tx.eldoradoOfferPrice.deleteMany({ where: { offerId: loserId } })
    return
  }
  await tx.eldoradoOfferPrice.create({
    data: {
      offerId: keeperId,
      base: loser.base,
      percent: loser.percent,
      result: loser.result,
    },
  })
  await tx.eldoradoOfferPrice.deleteMany({ where: { offerId: loserId } })
}

const upsertMergedFlag = async (tx, tableName, keeperId, loserId) => {
  const [keeper, loser] = await Promise.all([
    tx[tableName].findUnique({ where: { offerId: keeperId } }),
    tx[tableName].findUnique({ where: { offerId: loserId } }),
  ])
  if (!loser) return
  const enabled = Boolean(keeper?.enabled) || Boolean(loser?.enabled)
  await tx[tableName].upsert({
    where: { offerId: keeperId },
    update: { enabled },
    create: { offerId: keeperId, enabled },
  })
  await tx[tableName].deleteMany({ where: { offerId: loserId } })
}

const mergeAutomation = async (tx, keeperId, loserId) => {
  const [keeper, loser] = await Promise.all([
    tx.eldoradoOfferAutomation.findUnique({ where: { offerId: keeperId } }),
    tx.eldoradoOfferAutomation.findUnique({ where: { offerId: loserId } }),
  ])
  if (!loser) return

  const keeperBackends = Array.isArray(keeper?.backends)
    ? keeper.backends.map((item) => String(item ?? "").trim()).filter(Boolean)
    : []
  const loserBackends = Array.isArray(loser?.backends)
    ? loser.backends.map((item) => String(item ?? "").trim()).filter(Boolean)
    : []
  const mergedBackends = Array.from(
    new Set([
      ...keeperBackends,
      ...loserBackends,
      String(keeper?.backend ?? "").trim(),
      String(loser?.backend ?? "").trim(),
    ].filter(Boolean)),
  )
  const mergedBackend =
    mergedBackends[0] ??
    (String(keeper?.backend ?? loser?.backend ?? "").trim() || null)
  const enabled = Boolean(keeper?.enabled) || Boolean(loser?.enabled)

  await tx.eldoradoOfferAutomation.upsert({
    where: { offerId: keeperId },
    update: {
      enabled,
      backend: mergedBackend,
      backends: mergedBackends,
    },
    create: {
      offerId: keeperId,
      enabled,
      backend: mergedBackend,
      backends: mergedBackends,
    },
  })

  await tx.eldoradoOfferAutomation.deleteMany({ where: { offerId: loserId } })
}

const mergeOfferNote = async (tx, keeperId, loserId) => {
  const [keeper, loser] = await Promise.all([
    tx.eldoradoOfferNote.findUnique({ where: { offerId: keeperId } }),
    tx.eldoradoOfferNote.findUnique({ where: { offerId: loserId } }),
  ])
  if (!loser) return
  const keeperNote = String(keeper?.note ?? "").trim()
  const loserNote = String(loser?.note ?? "").trim()
  if (loserNote && !keeperNote) {
    await tx.eldoradoOfferNote.upsert({
      where: { offerId: keeperId },
      update: { note: loser.note },
      create: { offerId: keeperId, note: loser.note },
    })
  }
  await tx.eldoradoOfferNote.deleteMany({ where: { offerId: loserId } })
}

const mergeStar = async (tx, keeperId, loserId) => {
  const loserStar = await tx.eldoradoOfferStar.findUnique({ where: { offerId: loserId } })
  if (loserStar) {
    await tx.eldoradoOfferStar.upsert({
      where: { offerId: keeperId },
      update: {},
      create: { offerId: keeperId },
    })
    await tx.eldoradoOfferStar.deleteMany({ where: { offerId: loserId } })
  }
}

const moveOneToOneOfferRefIfEmpty = async (tx, tableName, keeperId, loserId) => {
  const [keeper, loser] = await Promise.all([
    tx[tableName].findUnique({ where: { offerId: keeperId } }),
    tx[tableName].findUnique({ where: { offerId: loserId } }),
  ])
  if (!loser) return
  if (!keeper) {
    const data = { ...loser, offerId: keeperId }
    delete data.createdAt
    delete data.updatedAt
    await tx[tableName].create({ data })
  }
  await tx[tableName].deleteMany({ where: { offerId: loserId } })
}

const mergeMessageTemplates = async (tx, keeperId, loserId) => {
  const loserRows = await tx.eldoradoMessageTemplate.findMany({ where: { offerId: loserId } })
  for (const row of loserRows) {
    await tx.eldoradoMessageTemplate.upsert({
      where: { offerId_label: { offerId: keeperId, label: row.label } },
      update: {},
      create: { offerId: keeperId, label: row.label },
    })
  }
  await tx.eldoradoMessageTemplate.deleteMany({ where: { offerId: loserId } })
}

const mergeAutomationTargets = async (tx, keeperId, loserId) => {
  const loserRows = await tx.eldoradoOfferAutomationTarget.findMany({ where: { offerId: loserId } })
  for (const row of loserRows) {
    const existing = await tx.eldoradoOfferAutomationTarget.findUnique({
      where: {
        offerId_backend_url: {
          offerId: keeperId,
          backend: row.backend,
          url: row.url,
        },
      },
    })
    if (existing) {
      if (!existing.starred && row.starred) {
        await tx.eldoradoOfferAutomationTarget.update({
          where: { id: existing.id },
          data: { starred: true },
        })
      }
      continue
    }
    await tx.eldoradoOfferAutomationTarget.create({
      data: {
        offerId: keeperId,
        backend: row.backend,
        url: row.url,
        starred: row.starred,
      },
    })
  }
  await tx.eldoradoOfferAutomationTarget.deleteMany({ where: { offerId: loserId } })
}

const moveLoserToKeeper = async (tx, keeperId, loserId) => {
  await Promise.all([
    tx.eldoradoKey.updateMany({ where: { offerId: loserId }, data: { offerId: keeperId } }),
    tx.eldoradoAutomationRunLog.updateMany({ where: { offerId: loserId }, data: { offerId: keeperId } }),
  ])

  await upsertMergedPrice(tx, keeperId, loserId)
  await upsertMergedFlag(tx, "eldoradoOfferPriceEnabled", keeperId, loserId)
  await upsertMergedFlag(tx, "eldoradoStockEnabled", keeperId, loserId)
  await mergeAutomation(tx, keeperId, loserId)
  await mergeOfferNote(tx, keeperId, loserId)
  await mergeStar(tx, keeperId, loserId)
  await mergeMessageTemplates(tx, keeperId, loserId)
  await mergeAutomationTargets(tx, keeperId, loserId)

  await moveOneToOneOfferRefIfEmpty(tx, "eldoradoStockGroupAssignment", keeperId, loserId)
  await moveOneToOneOfferRefIfEmpty(tx, "eldoradoNoteGroupAssignment", keeperId, loserId)
  await moveOneToOneOfferRefIfEmpty(tx, "eldoradoMessageGroupAssignment", keeperId, loserId)

  await tx.eldoradoOffer.deleteMany({ where: { id: loserId } })
}

const run = async () => {
  const offers = await prisma.eldoradoOffer.findMany({
    select: {
      id: true,
      name: true,
      href: true,
      kind: true,
      missing: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  })

  const groups = buildDuplicateGroups(offers)
  const plan = groups.map((group) => {
    const keeper = chooseKeeper(group.entries)
    const losers = group.entries.filter((entry) => entry.id !== keeper.id)
    return {
      key: group.groupKey,
      keeper,
      losers,
    }
  })
  const duplicateCount = plan.reduce((acc, item) => acc + item.losers.length, 0)

  console.log(`[dedupe] offers=${offers.length} groups=${plan.length} duplicate_rows=${duplicateCount}`)
  if (plan.length === 0) {
    return
  }

  const previewPath = path.join(
    process.cwd(),
    "src",
    "data",
    `eldorado-dedupe-preview-${Date.now()}.json`,
  )
  await fs.mkdir(path.dirname(previewPath), { recursive: true })
  await fs.writeFile(
    previewPath,
    `${JSON.stringify(
      plan.map((item) => ({
        key: item.key,
        keeper: item.keeper,
        loserIds: item.losers.map((row) => row.id),
      })),
      null,
      2,
    )}\n`,
    "utf8",
  )
  console.log(`[dedupe] preview saved: ${previewPath}`)

  if (!APPLY) {
    console.log("[dedupe] dry-run complete. Re-run with --apply to execute.")
    return
  }

  let processedGroups = 0
  let deletedRows = 0
  for (const item of plan) {
    if (item.losers.length === 0) continue
    await prisma.$transaction(async (tx) => {
      for (const loser of item.losers) {
        await moveLoserToKeeper(tx, item.keeper.id, loser.id)
        deletedRows += 1
      }
    })
    processedGroups += 1
    if (processedGroups % 50 === 0) {
      console.log(`[dedupe] processed_groups=${processedGroups}/${plan.length}`)
    }
  }

  const remaining = await prisma.eldoradoOffer.count()
  console.log(`[dedupe] done deleted_rows=${deletedRows} remaining_offers=${remaining}`)
}

run()
  .catch((error) => {
    console.error("[dedupe] failed:", error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
