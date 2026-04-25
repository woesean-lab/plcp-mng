const handleToastActionKeyDown = (event, onAction) => {
  if (event.key !== "Enter" && event.key !== " ") return
  event.preventDefault()
  onAction()
}

export const renderActionToast = (message, actionLabel, onAction) => {
  const normalizedMessage = String(message ?? "").trim()
  const normalizedActionLabel = String(actionLabel ?? "").trim()

  if (!normalizedActionLabel || typeof onAction !== "function") {
    return normalizedMessage
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span>{normalizedMessage}</span>
      <span
        role="button"
        tabIndex={0}
        onClick={onAction}
        onKeyDown={(event) => handleToastActionKeyDown(event, onAction)}
        style={{
          alignSelf: "flex-start",
          cursor: "pointer",
          fontSize: 12,
          lineHeight: 1.2,
          opacity: 0.95,
          textDecoration: "underline dotted",
          textUnderlineOffset: 3,
        }}
      >
        {normalizedActionLabel}
      </span>
    </div>
  )
}
