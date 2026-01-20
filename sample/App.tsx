import { useState } from "react";
import {
  type CustomComponentRegistry,
  DynamicForm,
  type FormConfiguration,
  type FormData,
} from "../src";
import { sampleContainerComponents } from "./containers";
import { sampleFieldComponents } from "./fields";
import { RatingField } from "./fields/RatingField";

/**
 * Custom components registry - maps component names to implementations.
 */
const customComponents: CustomComponentRegistry = {
  RatingField,
};

/**
 * Sample form configuration demonstrating various field types, validation,
 * container layouts (Phase 2), and JSON Logic conditional validation (Phase 3).
 */
const sampleFormConfig: FormConfiguration = {
  name: "Sample Form",
  elements: [
    {
      type: "text",
      name: "source.name",
      label: "Full Name",
      placeholder: "Enter your full name",
      validation: {
        required: true,
        minLength: 3,
        maxLength: 100,
      },
    },
    // Container layout example (Phase 2) - Two columns with multiple fields each
    // Width uses calc() to account for the 1rem gap between columns
    {
      type: "container",
      columns: [
        {
          type: "column",
          width: "calc(50% - 0.5rem)",
          elements: [
            {
              type: "email",
              name: "source.email",
              label: "Email Address",
              placeholder: "Enter your email",
              validation: {
                required: true,
              },
            },
            {
              type: "date",
              name: "source.birthDate",
              label: "Birth Date",
            },
          ],
        },
        {
          type: "column",
          width: "calc(50% - 0.5rem)",
          elements: [
            // Phase 3: Conditional validation with JSON Logic
            // Phone is only validated when hasPhone is checked
            {
              type: "boolean",
              name: "source.hasPhone",
              label: "I have a phone number",
            },
            {
              type: "phone",
              name: "source.phone",
              label: "Phone Number",
              placeholder: "1234567890",
              validation: {
                // JSON Logic condition: valid if hasPhone is false OR phone matches pattern
                condition: {
                  or: [
                    { "!": { var: "source.hasPhone" } },
                    {
                      and: [
                        { var: "source.hasPhone" },
                        {
                          regex_match: ["^[0-9]{10}$", { var: "source.phone" }],
                        },
                      ],
                    },
                  ],
                },
                message: "Please enter a valid 10-digit phone number",
              },
            },
          ],
        },
      ],
    },
    // =========================================================================
    // Select Fields - Dependent selects (country -> city)
    // =========================================================================
    {
      type: "container",
      columns: [
        {
          type: "column",
          width: "calc(50% - 0.5rem)",
          elements: [
            {
              type: "select",
              name: "source.country",
              label: "Country",
              options: [
                { value: "ua", label: "Ukraine" },
                { value: "us", label: "United States" },
                { value: "de", label: "Germany" },
                { value: "pl", label: "Poland" },
              ],
              clearable: true,
              searchable: true,
            },
          ],
        },
        {
          type: "column",
          width: "calc(50% - 0.5rem)",
          elements: [
            {
              type: "select",
              name: "source.city",
              label: "City",
              dependsOn: "source.country",
              resetOnParentChange: true,
              // Options would be filtered by country in real app via optionsSource resolver
              options: [
                // Ukraine
                { value: "kyiv", label: "Kyiv" },
                { value: "lviv", label: "Lviv" },
                { value: "odesa", label: "Odesa" },
                // US
                { value: "nyc", label: "New York" },
                { value: "la", label: "Los Angeles" },
                { value: "chicago", label: "Chicago" },
                // Germany
                { value: "berlin", label: "Berlin" },
                { value: "munich", label: "Munich" },
                // Poland
                { value: "warsaw", label: "Warsaw" },
                { value: "krakow", label: "Krakow" },
              ],
              clearable: true,
              searchable: true,
            },
          ],
        },
      ],
    },
    // =========================================================================
    // Visibility Test - Checkbox hides second field
    // =========================================================================
    {
      type: "container",
      columns: [
        {
          type: "column",
          width: "calc(50% - 0.5rem)",
          elements: [
            {
              type: "boolean",
              name: "source.showNickname",
              label: "Show nickname field",
              defaultValue: true,
            },
          ],
        },
        {
          type: "column",
          width: "calc(50% - 0.5rem)",
          elements: [
            {
              type: "text",
              name: "source.nickname",
              label: "Nickname",
              placeholder: "Enter your nickname",
              // Visibility controlled by checkbox
              visible: { "==": [{ var: "source.showNickname" }, true] },
            },
          ],
        },
      ],
    },
    // =========================================================================
    // Array Field - Contacts list with add/remove
    // =========================================================================
    {
      type: "array",
      name: "source.contacts",
      label: "Additional Contacts",
      itemFields: [
        {
          type: "text",
          name: "contactName",
          label: "Contact Name",
          placeholder: "Name",
          validation: { required: true },
        },
        {
          type: "email",
          name: "contactEmail",
          label: "Contact Email",
          placeholder: "email@example.com",
        },
        {
          type: "select",
          name: "contactType",
          label: "Contact Type",
          options: [
            { value: "work", label: "Work" },
            { value: "personal", label: "Personal" },
            { value: "emergency", label: "Emergency" },
          ],
        },
      ],
      minItems: 0,
      maxItems: 5,
      addButtonLabel: "Add Contact",
    },
    {
      type: "text",
      name: "source.company",
      label: "Company Name",
      placeholder: "Enter company name (optional)",
    },
    {
      type: "boolean",
      name: "source.acceptTerms",
      label: "I accept the terms and conditions",
      validation: {
        // Phase 3: JSON Logic condition requiring checkbox to be checked
        condition: { var: "source.acceptTerms" },
        message: "You must accept the terms and conditions",
      },
    },
    {
      type: "custom",
      name: "source.rating",
      label: "How would you rate our service?",
      component: "RatingField",
      componentProps: { maxStars: 5 },
    },
  ],
};

/**
 * Sample application demonstrating the DynamicForm component.
 */
export function App() {
  const [submittedData, setSubmittedData] = useState<FormData | null>(null);
  const [changeLog, setChangeLog] = useState<string[]>([]);

  const handleSubmit = (data: FormData) => {
    console.log("Form submitted:", data);
    setSubmittedData(data);
  };

  const handleChange = (data: FormData, changedField: string) => {
    console.log(`Field "${changedField}" changed:`, data);
    setChangeLog((prev) => [
      `${new Date().toLocaleTimeString()} - ${changedField} changed`,
      ...prev.slice(0, 9), // Keep last 10 entries
    ]);
  };

  const handleError = (errors: unknown) => {
    console.log("Form errors:", errors);
  };

  return (
    <div className="app">
      <header className="header">
        <h1>Dynamic Form Library - Sample</h1>
        <p>
          Phase 1-5: Field rendering, layouts, validation, visibility, select,
          arrays
        </p>
      </header>

      <main className="main">
        <section className="form-section">
          <h2>Sample Form</h2>
          <DynamicForm
            className="sample-form"
            config={sampleFormConfig}
            customComponents={customComponents}
            customContainers={sampleContainerComponents}
            fieldComponents={sampleFieldComponents}
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
                  <li key={entry}>{entry}</li>
                ))}
              </ul>
            ) : (
              <p className="placeholder">Change events will appear here</p>
            )}
          </section>
        </aside>
      </main>

      <footer className="footer">
        <p>Configuration-driven form generation with react-hook-form and Zod</p>
      </footer>
    </div>
  );
}

export default App;
