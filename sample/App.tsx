import { useRef, useState } from "react";
import { type ComponentRegistry, DynamicForm, type FormData } from "../src";
import { sampleContainerComponents } from "./containers";
import { sampleFieldComponents } from "./fields";
import { RatingField } from "./fields/RatingField";
import { sampleFormConfig } from "./sampleFormConfig";

/**
 * Component registry — single entry point for all visual implementations.
 *
 * The engine resolves every element through this registry:
 *   field     → components.fields[type]
 *   custom    → components.custom[component]
 *   container → components.containers[variant]
 */
const components: ComponentRegistry = {
  fields: sampleFieldComponents,
  custom: {
    RatingField,
  },
  containers: sampleContainerComponents,
};

/**
 * Sample application demonstrating the DynamicForm engine.
 */
export function App() {
  const [submittedData, setSubmittedData] = useState<FormData | null>(null);
  const [changeLog, setChangeLog] = useState<{ id: number; text: string }[]>(
    []
  );
  const nextId = useRef(0);

  const handleSubmit = (data: FormData) => {
    setSubmittedData(data);
  };

  const handleChange = (_data: FormData, changedField: string) => {
    const id = nextId.current++;
    setChangeLog((prev) => [
      {
        id,
        text: `${new Date().toLocaleTimeString()} — ${changedField}`,
      },
      ...prev.slice(0, 19),
    ]);
  };

  const handleError = (errors: unknown) => {
    const id = nextId.current++;
    const count = Object.keys(errors as Record<string, unknown>).length;
    setChangeLog((prev) => [
      {
        id,
        text: `${new Date().toLocaleTimeString()} — validation failed (${count} error${count === 1 ? "" : "s"})`,
      },
      ...prev.slice(0, 19),
    ]);
  };

  return (
    <div className="app">
      <header className="header">
        <h1>Dynamic Form Engine — Sample</h1>
        <p>
          Variant-based containers (section, row, column) · Validation ·
          Visibility · Dependent selects · Arrays · Custom components
        </p>
      </header>

      <main className="main">
        <section className="form-section">
          <DynamicForm
            className="sample-form"
            components={components}
            config={sampleFormConfig}
            onChange={handleChange}
            onError={handleError}
            onSubmit={handleSubmit}
          >
            <div className="form-actions">
              <button className="btn btn--primary" type="submit">
                Submit
              </button>
              <button className="btn btn--secondary" type="reset">
                Reset
              </button>
            </div>
          </DynamicForm>
        </section>

        <aside className="sidebar">
          <section className="output-section">
            <h3>Submitted Data</h3>
            {submittedData ? (
              <pre className="json-output">
                {JSON.stringify(submittedData, null, 2)}
              </pre>
            ) : (
              <p className="placeholder">Submit the form to see data here</p>
            )}
          </section>

          <section className="output-section">
            <h3>Change Log</h3>
            {changeLog.length > 0 ? (
              <ul className="change-log">
                {changeLog.map((entry) => (
                  <li key={entry.id}>{entry.text}</li>
                ))}
              </ul>
            ) : (
              <p className="placeholder">Change events will appear here</p>
            )}
          </section>
        </aside>
      </main>

      <footer className="footer">
        <p>
          Configuration-driven form engine — react-hook-form + Zod + JSON Logic
        </p>
      </footer>
    </div>
  );
}

export default App;
