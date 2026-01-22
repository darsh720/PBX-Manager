# Cloud PBX Platform

A full-stack VoIP management system designed to control and monitor Ubuntu Asterisk servers. This platform orchestrates the entire telephony infrastructure using a **Laravel** backend API and a **Next.js** frontend interface, providing real-time control, detailed reporting, and multi-tenant administration.

![Project Status](https://img.shields.io/badge/Status-Active-success)
![Stack](https://img.shields.io/badge/Stack-Laravel%20%7C%20Next.js%20%7C%20Asterisk-blue)

## 🚀 System Overview

The application acts as a central command center for your VoIP infrastructure:
* **Frontend (Next.js):** Provides a reactive, modern UI for tenants and administrators.
* **Backend (Laravel):** Handles business logic, database interactions (MySQL), and API endpoints.
* **Asterisk Core:** The underlying VoIP engine managed via secure shell commands (`sudo`) and database integration (`cdr`, `cel`, `pjsip`).

## ✨ Key Features

### 1. 🖥️ Real-Time Dashboard
* **Live Metrics:** Visualize active calls, channel usage, and trunk registration status in real-time.
* **Extension Monitoring:** Track PJSIP endpoint states (Online, Offline, Mobile, In-Use).
* **Tenant Health:** Live call graphs and connection health metrics per property/tenant.

### 2. 📞 Advanced Call Logging (CDR & CEL)
* **Detailed Records:** Searchable Call Detail Records (CDR) with precision filtering (Date, Source, Destination, Disposition).
* **Deep Dive:** Call Event Logging (CEL) viewer for debugging complex call flows, transfers, and hangup causes.
* **Visual Data:** Auto-detected date ranges and visual status indicators for call direction.

### 3. ⚙️ Asterisk Server Integration
* **Command Execution:** Securely executes Asterisk CLI commands (e.g., `pjsip show endpoints`, `core show channels`) via PHP `shell_exec`.
* **Dynamic Configuration:** Manages SIP endpoints, extensions, DIDs, and dial plans directly from the web UI.
* **Multi-Node Support:** Capable of managing multiple PBX nodes via API connectors (`pbxClient.js`, `pbxNodes.js`).

### 4. 💰 Billing & Analytics
* **Usage Tracking:** Exact calculation of `billsec` (billable seconds) vs. total duration.
* **Historical Analysis:** Automated date detection and reporting for historical data viewing.

## 🛠 Tech Stack

| Component | Technology | Description |
| :--- | :--- | :--- |
| **Frontend** | **Next.js 14+** | React framework with Tailwind CSS for UI. |
| **Backend** | **Laravel 10/11** | PHP API handling logic and Asterisk control. |
| **Database** | **MySQL / MariaDB** | Stores CDRs, CELs, and App Data. |
| **Telephony** | **Asterisk 18+** | VoIP server (PJSIP driver). |
| **OS** | **Ubuntu Linux** | Host operating system. |

## 📂 Project Structure

Based on the `CLOUD` directory:

```text
CLOUD/
├── backend/                 # Laravel API Application
│   ├── app/Http/Controllers # Controllers (Dashboard, CDR, Tenants, Realtime)
│   ├── routes/              # API Routes (api.php, channels.php)
│   └── ...
├── frontend/                # Next.js Client Application
│   ├── src/app/             # Pages (Dashboard, CDRs, Tenant Views)
│   ├── src/lib/             # API Connectors (Axios, pbxClient)
│   └── ...
