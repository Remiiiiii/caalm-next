Please adapt the globs depending on your project structure.

---

name: vite-best-practices.mdc
description: Best practices for Vite applications
globs: \*_/_.{ts,tsx,js,jsx}

---

- Use Vite's built-in features for fast development and hot module replacement.
- Optimize build performance by configuring the `build.rollupOptions` in `vite.config.js`.
- Leverage Vite plugins for enhanced functionality, such as `@vitejs/plugin-react-swc` for React support.

---

name: react-best-practices.mdc
description: Best practices for React applications
globs: \*_/_.{ts,tsx,js,jsx}

---

- Use functional components and hooks for state management.
- Implement React's Context API for global state management.
- Optimize performance with `React.memo` and `useMemo` for expensive calculations.

---

name: react-query-best-practices.mdc
description: Best practices for data fetching with React Query
globs: \*_/_.{ts,tsx,js,jsx}

---

- Use `useQuery` and `useMutation` hooks for data fetching and mutations.
- Implement query invalidation to keep data fresh.
- Utilize caching strategies to minimize unnecessary network requests.

---

name: react-hook-form-best-practices.mdc
description: Best practices for form handling with React Hook Form
globs: \*_/_.{ts,tsx,js,jsx}

---

- Use `useForm` to manage form state and validation.
- Integrate with `zod` for schema validation.
- Leverage `Controller` for custom components to maintain compatibility with React Hook Form.

---

name: tailwindcss-best-practices.mdc
description: Best practices for styling with Tailwind CSS
globs: \*_/_.{ts,tsx,css}

---

- Use utility-first classes for rapid UI development.
- Create custom themes using Tailwind's configuration file.
- Utilize `@apply` for reusable styles in your CSS files.

---

name: radix-ui-best-practices.mdc
description: Best practices for using Radix UI components
globs: \*_/_.{ts,tsx}

---

- Use Radix components for accessible and customizable UI elements.
- Follow the documentation for proper usage and customization of components.
- Ensure proper keyboard navigation and focus management for all interactive elements.

---

name: zod-best-practices.mdc
description: Best practices for schema validation with Zod
globs: \*_/_.{ts,tsx}

---

- Define schemas for data validation to ensure type safety.
- Use Zod's built-in methods for complex validations.
- Integrate Zod with React Hook Form for seamless form validation.

---

name: typescript-best-practices.mdc
description: TypeScript coding standards and type safety guidelines
globs: \*_/_.{ts,tsx}

---

- Use strict null checks to avoid runtime errors.
- Prefer interfaces over types for object shapes.
- Utilize type guards and assertions for better type safety.
- Implement proper type inference to reduce redundancy.

---

name: dialog-best-practices.mdc
description: Enterprise/professional UI standards for dialogs and modals
globs: \*_/_.{ts,tsx,js,jsx}

---

- All dialogs, modals, and popups must follow enterprise/professional UI design standards.
- When creating or updating any dialog, automatically apply the standard structure with professional cap bar, gradient header, scrollable content, and footer.
- Reference OutlookStyleCalendar.tsx dialogs for correct implementation patterns.
- Use consistent color palette, spacing, and interactive elements throughout all dialogs.

---

name: server-restart-indication.mdc
description: Server restart indication rules for code changes
globs: \*_/_.{ts,tsx,js,jsx,md,json}

---

- Include one of these indicators in responses when fixing or updating code:
- 🟢 No Restart Needed:
  - "✅ No server restart required - this is a frontend-only change"
  - "🔄 Page refresh sufficient - only UI components were modified"
- 🔴 Server Restart Required:
  - "⚠️ SERVER RESTART REQUIRED - server-side code was modified"
- Use the appropriate indicator based on the scope of changes made
