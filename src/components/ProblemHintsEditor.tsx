import { Markdown } from './Markdown'
import { Button, Field } from './Ui'

export function ProblemHintsEditor({ hints, onChange }: { hints: string[]; onChange: (hints: string[]) => void }) {
  function move(index: number, direction: -1 | 1) {
    const next = [...hints]
    ;[next[index], next[index + direction]] = [next[index + direction], next[index]]
    onChange(next)
  }

  return <section aria-label="Practice hints">
    <h3>Step-by-step hints</h3>
    <p className="muted">Students reveal one hint at a time in this order. Use Markdown for explanations and maths. Empty hints are left out when saved.</p>
    {hints.map((hint, index) => <div className="form-panel" key={index}>
      <Field label={`Hint ${index + 1}`}><textarea rows={3} value={hint} onChange={event => onChange(hints.map((value, i) => i === index ? event.target.value : value))} /></Field>
      <div className="button-row">
        <Button type="button" variant="ghost" aria-label={`Move hint ${index + 1} up`} disabled={index === 0} onClick={() => move(index, -1)}>Move up</Button>
        <Button type="button" variant="ghost" aria-label={`Move hint ${index + 1} down`} disabled={index === hints.length - 1} onClick={() => move(index, 1)}>Move down</Button>
        <Button type="button" variant="ghost" aria-label={`Remove hint ${index + 1}`} onClick={() => onChange(hints.filter((_, i) => i !== index))}>Remove</Button>
      </div>
      {hint.trim() && <details><summary>Preview hint {index + 1}</summary><Markdown text={hint} /></details>}
    </div>)}
    <Button type="button" variant="secondary" onClick={() => onChange([...hints, ''])}>Add hint</Button>
  </section>
}
