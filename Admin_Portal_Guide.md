# Admin Portal User Guide

This guide provides a comprehensive overview of the administrative functions of the portal. You can use this content to create your PowerPoint presentation.

---

## Slide 1: System Overview
**Purpose:** Centralized management of organizational portal.
**Key Capabilities:**
- User and Role Management (RBAC).
- System-wide Configuration & Settings.
- Global Theme Customization.
- Auditing & Diagnostic Monitoring.

---

## Slide 2: Access & Authentication
- **Login**: Navigate to the portal URL and authenticate using authorized administrative credentials.
- **Roles**: Ensure you have `SUPER_ADMIN` or equivalent privileges to access sensitive configuration panels.

---

## Slide 3: Managing Users & Roles
- **Dashboard**: Access the User Management module from the sidebar.
- **Actions**:
    - **Add/Edit Users**: Manage contact details and departmental assignments.
    - **Permissions**: Assign roles based on the principle of least privilege (Admin, Manager, User).
- **Security**: Regularly review active sessions and audit logs for unauthorized access attempts.

---

## Slide 4: System Configuration & Policies
- **Settings Module**: Access via the configuration sidebar.
- **Policy Management**:
    - Manage leave policies, department structures, and system-wide settings.
- **Impact**: Changes here apply globally to all users. **Always review changes before saving.**

---

## Slide 5: Global Theme Customization
- **Access**: Navigate to the Theme Management dashboard.
- **Customization**:
    - Adjust branding: Colors, Font Families, Border Radius.
    - Set Active Theme: Ensure the "Global Active Theme" is set to provide a consistent look and feel.
- **Persistence**: Changes are persisted to the database and will reflect immediately upon page refresh for all users.

---

## Slide 6: Monitoring, Auditing & Diagnostics
- **Audit Logs**: Track historical user actions and system changes.
- **Diagnostics**:
    - Check system health status (Database connection, uptime).
    - Review data consistency reports if users report issues.

---

## Slide 7: Troubleshooting
- **Common Issues**:
    - If changes don't appear: Check database connectivity via the Diagnostics tab.
    - If access is denied: Verify role assignments in the User Management module.
- **Support**: For critical failures, check the server logs via the admin diagnostic tools or contact technical support with the specific timestamp and error code.
