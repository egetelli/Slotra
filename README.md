# 📅 Slotra - Modern Frontend Application

**Slotra Frontend** is a cutting-edge, highly responsive, and interactive user interface built for the Slotra Appointment Management System. Developed with **Angular 17+**, it fully embraces the new **Signals** reactivity model and **Standalone Components** to deliver a blazing-fast, glitch-free user experience.

---

## 🚀 Key Features

* **⚡ Signal-Based Reactivity:** Completely eliminates `RxJS` overhead in UI components by using Angular's latest `signal()` and `computed()` properties for instant, tear-free DOM updates.
* **👑 Master Admin Dashboard:** A highly sophisticated control panel allowing administrators to manage users, configure provider profiles, and oversee system-wide financial analytics.
* **🧠 Smart Data Fetching & Filtering:** Implements lazy-loading and provider-based filtering on heavy views (like the Calendar and Client List) to prevent browser freezing and optimize rendering performance.
* **🎨 Glassmorphism UI & Tailwind CSS:** A stunning, modern, and clean aesthetic utilizing backdrop blurs, subtle gradients, and fully responsive layouts that look perfect on mobile, tablet, and desktop screens.
* **🛠️ Centralized UI Management:** A custom `UiService` handles all interactive elements like Toasts, Confirm Dialogs, and Modals dynamically, replacing ugly native browser alerts with beautiful, non-blocking UI components.
* **📅 FullCalendar Integration:** Advanced scheduling views with drag-and-drop support, customized to display appointments conditionally based on user roles (Admin vs. Provider).
* **🛡️ Route Protection & Auth:** Secure Angular Route Guards and HTTP Interceptors that automatically attach JWT tokens and handle refresh-token logic seamlessly.

---

## 🛠️ Tech Stack

* **Framework:** Angular 17+ (Strictly Standalone Components)
* **State Management:** Angular Signals (`signal`, `computed`, `effect`)
* **Styling & CSS:** Tailwind CSS
* **Routing:** Angular Router (Lazy Loaded Features)
* **Calendar Component:** FullCalendar (`@fullcalendar/angular`)
* **HTTP Client:** Angular `HttpClient` (with Functional Interceptors)

---

## 📂 Project Architecture

The project strictly follows a feature-based folder structure to ensure long-term maintainability and scalability:

```text
src/
├── app/
│   ├── core/               # Singleton services, guards, interceptors, and models
│   │   ├── models/         # TypeScript interfaces (User, Client, Appointment)
│   │   ├── services/       # API communication (AdminService, AuthService, UiService)
│   │   └── interceptors/   # Auth and Error interceptors
│   ├── features/           # Feature modules (Lazy Loaded)
│   │   ├── admin-settings/ # Admin configuration and provider management
│   │   ├── appointments/   # Appointment lists and tables
│   │   ├── calendar/       # FullCalendar integration
│   │   ├── clients/        # Client list and revenue analytics
│   │   └── dashboard/      # Main analytics dashboard
│   ├── shared/             # Reusable UI components (Buttons, Modals, Spinners)
│   ├── app.routes.ts       # Global routing configuration
│   └── app.config.ts       # Application-wide providers (HttpClient, Router)
├── assets/                 # Static files (images, icons)
├── styles.scss             # Global Tailwind imports and custom scrollbar styles
```

---

## ⚙️ Installation & Setup

### **1. Prerequisites**
* Node.js (v18+ recommended)
* Angular CLI (`npm install -g @angular/cli`)

### **2. Install Dependencies**
Navigate to the frontend directory and install the required NPM packages:
```bash
npm install
```

### **3. Environment Configuration**
Ensure your API URL is correctly pointed to the backend service. Create or modify the `src/environments/environment.ts` file:
```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api'
};
```

### **4. Development Server**
Run the application in development mode:
```bash
ng serve
```
Navigate to `http://localhost:4200/`. The application will automatically reload if you change any of the source files.

---

## 🏗️ Core Mechanisms Explained

### **The `UiService` Pattern**
Instead of using native `alert()` or `confirm()` which blocks the JavaScript thread, Slotra uses a centralized `UiService`. This allows any component to trigger beautiful, animated modals and toast notifications synchronously:
```typescript
this.uiService.openConfirm(
  'Delete User', 
  'Are you sure you want to delete this user?', 
  'danger', 
  () => this.adminService.deleteUser(id).subscribe(...)
);
```

### **Admin vs. Provider Rendering**
Heavy views like `AppointmentsComponent` use `computed()` signals to intelligently decide what data to show based on the active user's role. If an Admin logs in, the table awaits a provider selection to fetch data, saving massive amounts of memory.

---

## 👨‍💻 Developer

* **Ege Telli** - *Frontend & Full Stack Architect*

---

### **Roadmap**

* [x] Migrate all components to Angular 17 Standalone structure.
* [x] Implement global Signal-based State Management.
* [x] Build custom Glassmorphism UI components.
* [x] Integrate WebSocket for real-time appointment notifications without page refresh.
* [ ] Add dynamic multi-language (i18n) support.
* [ ] Implement comprehensive End-to-End (E2E) testing with Cypress or Playwright.

```
