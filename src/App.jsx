import { useMemo, useState } from 'react'
import './App.css'

const messageTemplates = [
  { label: 'Hoş geldin', value: 'Hoş geldin! Burada herkese yer var.' },
  { label: 'Bilgilendirme', value: 'Son durum: Görev planlandığı gibi ilerliyor.' },
  { label: 'Hatırlatma', value: 'Unutma: Akşam 6:00 toplantısına hazır ol.' },
]

function App() {
  const [title, setTitle] = useState('Ugur Yorulmaz')
  const [message, setMessage] = useState(messageTemplates[0].value)
  const [templates, setTemplates] = useState(messageTemplates)
  const [selectedTemplate, setSelectedTemplate] = useState(messageTemplates[0].label)

  const activeTemplate = useMemo(
    () => templates.find((tpl) => tpl.label === selectedTemplate),
    [selectedTemplate, templates],
  )

  const messageLength = message.trim().length

  const handleTemplateChange = (event) => {
    const nextTemplate = event.target.value
    setSelectedTemplate(nextTemplate)
    const tpl = templates.find((item) => item.label === nextTemplate)
    if (tpl) setMessage(tpl.value)
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message)
      alert('Mesaj kopyalandı')
    } catch (error) {
      console.error('Copy failed', error)
      alert('Kopyalama başarısız oldu')
    }
  }

  const handleAdd = () => {
    if (!title.trim() && !message.trim()) return
    const safeTitle = title.trim() || `Mesaj ${templates.length + 1}`
    const safeMessage = message.trim()

    const exists = templates.some((tpl) => tpl.label === safeTitle)
    if (!exists) {
      const nextTemplates = [...templates, { label: safeTitle, value: safeMessage }]
      setTemplates(nextTemplates)
    }
    setSelectedTemplate(safeTitle)
  }

  const handleDeleteTemplate = () => {
    if (templates.length <= 1) {
      alert('En az bir şablon kalmalı.')
      return
    }
    const nextTemplates = templates.filter((tpl) => tpl.label !== selectedTemplate)
    const fallback = nextTemplates[0]
    setTemplates(nextTemplates)
    setSelectedTemplate(fallback.label)
    setMessage(fallback.value)
  }

  return (
    <div className="page">
      <header className="page__header">
        <p className="page__eyebrow">Mesaj panosu</p>
        <h1>{title || 'Ugur Yorulmaz'}</h1>
        <p className="page__subtitle">Başlık belirle, şablonu seç, metni düzenle ve kopyala.</p>
        <div className="metrics">
          <span className="metric">Şablon: {templates.length}</span>
          <span className="metric">Karakter: {messageLength}</span>
        </div>
      </header>

      <section className="panel">
        <div className="panel__grid">
          <div className="stack">
            <div className="field">
              <label htmlFor="title">Başlık</label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Örn: Karşılama"
              />
            </div>

            <div className="field">
              <label htmlFor="template">Şablon</label>
              <div className="field__inline">
                <select id="template" value={selectedTemplate} onChange={handleTemplateChange}>
                  {templates.map((tpl) => (
                    <option key={tpl.label} value={tpl.label}>
                      {tpl.label}
                    </option>
                  ))}
                </select>
                <div className="actions-inline">
                  <button type="button" className="ghost" onClick={handleCopy}>
                    Kopyala
                  </button>
                  <button type="button" className="ghost danger" onClick={handleDeleteTemplate}>
                    Sil
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="stack">
            <div className="field">
              <label htmlFor="message">Mesaj</label>
              <textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={6}
                placeholder="Mesaj içeriği"
              />
              <div className="helper">
                <span>Seçili şablon: {activeTemplate?.label || 'Yok'}</span>
                <span>{messageLength} karakter</span>
              </div>
            </div>

            <div className="field field--actions">
              <button type="button" onClick={handleAdd}>
                Ekle
              </button>
              <button type="button" className="ghost" onClick={() => setMessage('')}>
                Temizle
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default App
