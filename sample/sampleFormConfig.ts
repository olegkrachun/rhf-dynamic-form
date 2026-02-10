import type { FormConfiguration } from "../src";

/**
 * Comprehensive sample form configuration demonstrating ALL engine features:
 *
 * 1. Container variants — section, row, column
 * 2. Field types — text, email, phone, date, boolean, select, array, custom
 * 3. Validation — required, minLength, maxLength, JSON Logic conditions
 * 4. Visibility — JSON Logic conditional show/hide
 * 5. Dependent selects — country → city cascade with resetOnParentChange
 * 6. Array fields — repeatable contact groups
 * 7. Custom components — RatingField with componentProps
 * 8. Meta pass-through — width, title, description, gap
 */
export const sampleFormConfig: FormConfiguration = {
  name: "Employee Onboarding",
  elements: [
    // =========================================================================
    // Section: Personal Information
    // Demonstrates: section variant, row/column layout, basic validation
    // =========================================================================
    {
      type: "container",
      variant: "section",
      meta: {
        title: "Personal Information",
        description: "Enter the employee's basic personal details.",
      },
      children: [
        // Full Name — standalone field (full width, no row wrapper needed)
        {
          type: "text",
          name: "source.fullName",
          label: "Full Name",
          placeholder: "Enter full name",
          validation: {
            required: true,
            minLength: 3,
            maxLength: 100,
          },
        },
        // Row: Email + Birth Date side by side
        {
          type: "container",
          variant: "row",
          children: [
            {
              type: "container",
              variant: "column",
              meta: { width: "calc(50% - 0.5rem)" },
              children: [
                {
                  type: "email",
                  name: "source.email",
                  label: "Email Address",
                  placeholder: "employee@company.com",
                  validation: { required: true },
                },
              ],
            },
            {
              type: "container",
              variant: "column",
              meta: { width: "calc(50% - 0.5rem)" },
              children: [
                {
                  type: "date",
                  name: "source.birthDate",
                  label: "Date of Birth",
                },
              ],
            },
          ],
        },
        // Row: Phone toggle + Phone number (conditional validation + visibility)
        {
          type: "container",
          variant: "row",
          children: [
            {
              type: "container",
              variant: "column",
              meta: { width: "calc(50% - 0.5rem)" },
              children: [
                {
                  type: "boolean",
                  name: "source.hasPhone",
                  label: "I have a phone number",
                },
              ],
            },
            {
              type: "container",
              variant: "column",
              meta: { width: "calc(50% - 0.5rem)" },
              children: [
                {
                  type: "phone",
                  name: "source.phone",
                  label: "Phone Number",
                  placeholder: "1234567890",
                  // Only visible when hasPhone is checked
                  visible: { "==": [{ var: "source.hasPhone" }, true] },
                  validation: {
                    // JSON Logic: valid when hasPhone is false OR phone matches 10 digits
                    condition: {
                      or: [
                        { "!": { var: "source.hasPhone" } },
                        {
                          and: [
                            { var: "source.hasPhone" },
                            {
                              regex_match: [
                                "^[0-9]{10}$",
                                { var: "source.phone" },
                              ],
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
      ],
    },

    // =========================================================================
    // Section: Location
    // Demonstrates: dependent selects, resetOnParentChange, searchable
    // =========================================================================
    {
      type: "container",
      variant: "section",
      meta: {
        title: "Location",
        description: "Select your country and city.",
      },
      children: [
        {
          type: "container",
          variant: "row",
          children: [
            {
              type: "container",
              variant: "column",
              meta: { width: "calc(50% - 0.5rem)" },
              children: [
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
                  validation: { required: true },
                },
              ],
            },
            {
              type: "container",
              variant: "column",
              meta: { width: "calc(50% - 0.5rem)" },
              children: [
                {
                  type: "select",
                  name: "source.city",
                  label: "City",
                  dependsOn: "source.country",
                  resetOnParentChange: true,
                  options: [
                    { value: "kyiv", label: "Kyiv" },
                    { value: "lviv", label: "Lviv" },
                    { value: "odesa", label: "Odesa" },
                    { value: "nyc", label: "New York" },
                    { value: "la", label: "Los Angeles" },
                    { value: "chicago", label: "Chicago" },
                    { value: "berlin", label: "Berlin" },
                    { value: "munich", label: "Munich" },
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
      ],
    },

    // =========================================================================
    // Section: Employment Details
    // Demonstrates: 3-column layout, visibility toggle, select options
    // =========================================================================
    {
      type: "container",
      variant: "section",
      meta: {
        title: "Employment Details",
        description: "Information about the employee's role and department.",
      },
      children: [
        // Row: Company + Department + Role (3 columns)
        {
          type: "container",
          variant: "row",
          children: [
            {
              type: "container",
              variant: "column",
              meta: { width: "calc(33.333% - 0.667rem)" },
              children: [
                {
                  type: "text",
                  name: "source.company",
                  label: "Company Name",
                  placeholder: "Enter company name",
                  validation: { required: true },
                },
              ],
            },
            {
              type: "container",
              variant: "column",
              meta: { width: "calc(33.333% - 0.667rem)" },
              children: [
                {
                  type: "select",
                  name: "source.department",
                  label: "Department",
                  options: [
                    { value: "engineering", label: "Engineering" },
                    { value: "design", label: "Design" },
                    { value: "product", label: "Product" },
                    { value: "marketing", label: "Marketing" },
                    { value: "hr", label: "Human Resources" },
                    { value: "finance", label: "Finance" },
                  ],
                  clearable: true,
                },
              ],
            },
            {
              type: "container",
              variant: "column",
              meta: { width: "calc(33.333% - 0.667rem)" },
              children: [
                {
                  type: "text",
                  name: "source.jobTitle",
                  label: "Job Title",
                  placeholder: "e.g. Senior Engineer",
                },
              ],
            },
          ],
        },
        // Row: Nickname visibility toggle + Nickname field
        {
          type: "container",
          variant: "row",
          children: [
            {
              type: "container",
              variant: "column",
              meta: { width: "calc(50% - 0.5rem)" },
              children: [
                {
                  type: "boolean",
                  name: "source.showNickname",
                  label: "Employee has a preferred nickname",
                  defaultValue: false,
                },
              ],
            },
            {
              type: "container",
              variant: "column",
              meta: { width: "calc(50% - 0.5rem)" },
              children: [
                {
                  type: "text",
                  name: "source.nickname",
                  label: "Preferred Nickname",
                  placeholder: "Enter nickname",
                  visible: { "==": [{ var: "source.showNickname" }, true] },
                },
              ],
            },
          ],
        },
      ],
    },

    // =========================================================================
    // Section: Emergency Contacts (Array Field)
    // Demonstrates: array/repeater, itemFields, min/max items
    // =========================================================================
    {
      type: "container",
      variant: "section",
      meta: {
        title: "Emergency Contacts",
        description:
          "Add at least one emergency contact. Up to 5 contacts allowed.",
      },
      children: [
        {
          type: "array",
          name: "source.emergencyContacts",
          label: "Contacts",
          itemFields: [
            {
              type: "text",
              name: "contactName",
              label: "Contact Name",
              placeholder: "Full name",
              validation: { required: true },
            },
            {
              type: "phone",
              name: "contactPhone",
              label: "Contact Phone",
              placeholder: "1234567890",
            },
            {
              type: "email",
              name: "contactEmail",
              label: "Contact Email",
              placeholder: "email@example.com",
            },
            {
              type: "select",
              name: "relationship",
              label: "Relationship",
              options: [
                { value: "spouse", label: "Spouse" },
                { value: "parent", label: "Parent" },
                { value: "sibling", label: "Sibling" },
                { value: "friend", label: "Friend" },
                { value: "other", label: "Other" },
              ],
            },
          ],
          minItems: 1,
          maxItems: 5,
          addButtonLabel: "Add Emergency Contact",
        },
      ],
    },

    // =========================================================================
    // Section: Feedback & Agreement
    // Demonstrates: custom component (RatingField), conditional validation
    // =========================================================================
    {
      type: "container",
      variant: "section",
      meta: {
        title: "Feedback & Agreement",
      },
      children: [
        {
          type: "custom",
          name: "source.rating",
          label: "How would you rate the onboarding experience?",
          component: "RatingField",
          componentProps: { maxStars: 5 },
        },
        {
          type: "text",
          name: "source.comments",
          label: "Additional Comments",
          placeholder: "Any feedback or notes...",
        },
        {
          type: "boolean",
          name: "source.acceptTerms",
          label: "I accept the terms and conditions",
          validation: {
            condition: { var: "source.acceptTerms" },
            message: "You must accept the terms and conditions",
          },
        },
      ],
    },
  ],
};
