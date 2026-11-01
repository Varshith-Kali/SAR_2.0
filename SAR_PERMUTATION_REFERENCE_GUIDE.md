# SAR Assist — Master Preliminary-to-Detailed Checklist Permutation Reference Guide (`def-v1.5.0`)

> **Document Purpose:** Authoritative reference specification of all **30 Preliminary Discovery Questions (`P1`–`P30`)**, all **107 Selectable Options**, **16 Derived Risk & Topology Flags**, **16 Security Checklist Domains (`M1`–`M16`)**, **38 Detailed Security Checklist Questions (`M1.1`–`M16.2`)**, **4 Architecture Repeater Tables**, **Minor Enhancement Scope Narrowing (`P4`)**, **7 High-Risk Override Triggers (`OVR-01`–`OVR-07`)**, and **7 Cross-Answer Contradiction Rules (`CHK-01`–`CHK-07`)**.
>
> **Printable PDF Access in Application:** Click **"Permutation PDF"** in the top navigation bar or **"Open / Print Master Permutation PDF"** on the Permutation Simulator / Rules Admin screens to open or save the landscape A4 PDF report with embedded vector architecture diagrams.

---

## 1. Visual Architecture & Permutation Representation Diagram

```
+----------------------------------------------------------------------------------------------------------------------+
|                                SAR ASSIST DETERMINISTIC PERMUTATION PIPELINE (def-v1.5.0)                            |
+----------------------------------------------------------------------------------------------------------------------+

  +-----------------------------------+        +-----------------------------------+
  | 1. PRELIMINARY DISCOVERY (P1-P30) |        | 2. DETERMINISTIC ENGINE & FLAGS   |
  |    6 Stages · 107 Total Options   |        |    evaluateSAR() Pure Function    |
  +-----------------------------------+        +-----------------------------------+
  | Stage 1: What is changing? (P1-P4)|        | • Option Behavior Filter:         |
  |  └─ P2, P3, P4 show ONLY IF       |        |   - 74 Unlock / Convergence Opts  |
  |     P1 includes 'enhancement'     | =====> |   - 33 Fact-Only Baseline Opts    |
  | Stage 2: Where will it run? (P5-7)|        |   - Fail-Open 'not_sure' Opts     |
  | Stage 3: Who/how accessed? (P8-12)|        |                                   |
  | Stage 4: What it connects? (P13-18| =====> | • 16 Derived Risk Flags (DAG):    |
  |  └─ P14, P15, P16 show ONLY IF    |        |   - internet_facing               |
  |     P13 != 'no'                   |        |   - pii_or_pci_in_scope           |
  | Stage 5: What data? (P19-P26)     |        |   - external_party_involved       |
  |  └─ P20-P24 show ONLY IF P19='yes'|        |   - customer_facing_sensitive     |
  | Stage 6: Anything new? (P27-P30)  |        |   - non_human_identity_present    |
  +-----------------------------------+        |   - cloud_hosted / on_prem / hyb  |
                                               |   - external_file_transfer        |
                                               |   - ai_or_llm / external_ai       |
                                               |   - new_trust_boundary_crossing   |
                                               |   - scope_narrowed                |
                                               +-----------------+-----------------+
                                                                 |
                                                                 v
  +-----------------------------------+        +-----------------------------------+
  | 4. QUESTION-LEVEL CONVERGENCE &   |        | 3. SCOPE NARROWING & OVERRIDES    |
  |    DETAILED CHECKLIST (M1.1-M16.2)| <===== |    Minor Enhancement Filter Gate  |
  +-----------------------------------+        +-----------------------------------+
  | • 16 Security Domains (M1-M16):   |        | IF P1=['enhancement'] ONLY        |
  |   M1: App Core      M9:  RPA Bots |        | AND P2='yes' (Past SAR exists)    |
  |   M2: IAM & PAM     M10: On-Prem  |        | AND P3='minor' (Minor change):    |
  |   M3: Architecture  M11: Cloud VPC|        |  └─ Narrows strictly to P4        |
  |   M4: Data/PII/PCI  M12: Firewall |        |     touched components            |
  |   M5: APIs & Sync   M13: Migration|        |                                   |
  |   M6: SFTP / Files  M14: Mobile   |        | UNLESS ANY 7 OVERRIDES FIRE:      |
  |   M7: Queues/Events M15: AI / LLM |        |  OVR-01: P17=yes/not_sure (FW)    |
  |   M8: Vendor / SaaS M16: SIEM & DR|        |  OVR-02: P18=yes/not_sure (Vendor)|
  |                                   |        |  OVR-03: P21=pii/pci/secrets      |
  | • 4 Architecture Repeater Tables: |        |  OVR-04: P28!=no (AI/LLM)         |
  |   1. Servers & VMs Inventory      |        |  OVR-05: P10=internet/partner_net |
  |   2. Network Firewall Rules       |        |  OVR-06: P8=customers/partner     |
  |   3. API Endpoints Inventory      |        |  OVR-07: P15=yes/not_sure (Zone)  |
  |   4. System Integrations Matrix   |        +-----------------------------------+
  +-----------------------------------+
```

---

## 2. Master Table — All 30 Preliminary Questions (`P1`–`P30`) & What Each Option Unlocks

### Stage 1: What is changing? (`P1`–`P4`)

| Code | Question Text | Prerequisite (`Show Only If`) | Option Label (`id`) | Behavior | Derived Flags / Facts Set | Unlocked Sections & Repeater Tables | Unlocked / Converged Detailed Checklist Controls (`M1.1`–`M16.2`) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **P1** | What are you bringing for review? *(Multi-Select)* | Always shown | **New application** (`new_app`) | Unlocks Checklist | `intent_new_app=true` | `M1`, `M2`, `M3`, `M16` + Integrations Table | `M1.1` (Criticality Tier), `M1.2` (SAST/SCA/DAST), `M2.1` (Enterprise SSO/MFA), `M2.2` (Secrets Vault), `M3.1` (3-Tier Segmentation), `M3.2` (Trust Boundary Flow), `M16.1` (SIEM Logging), `M16.2` (DR RPO/RTO) |
| **P1** | What are you bringing for review? | Always shown | **Change / enhancement to an existing application** (`enhancement`) | Unlocks Checklist | `intent_enhancement=true` *(Reveals P2, P3, P4)* | `M1`, `M2`, `M3`, `M16` *(Subject to P3/P4 Scope Narrowing)* | `M1.1`, `M1.2`, `M2.1`, `M3.1`, `M16.1` *(plus P2, P3, P4 in Stage 1)* |
| **P1** | What are you bringing for review? | Always shown | **New integration or data feed** (`new_integration`) | Unlocks Checklist | `external_integration=true` | `M3`, `M5` + API & Integrations Tables | `M3.1`, `M3.2`, `M5.1` (API Auth mTLS/OAuth2), `M5.2` (Rate Limiting & Schema Validation) |
| **P1** | What are you bringing for review? | Always shown | **Third-party / vendor onboarding** (`vendor_onboarding`) | Unlocks Checklist | `vendor_involved=true`, Flag: `external_party_involved` | `M2`, `M8` | `M2.1` (SSO/MFA), `M8.1` (Vendor SOC2/ISO27001 & TPRM), `M8.2` (Vendor Code Escrow & SAST) |
| **P1** | What are you bringing for review? | Always shown | **SaaS or external portal** (`saas_portal`) | Unlocks Checklist | `saas_in_scope=true`, Flag: `external_party_involved` | `M2`, `M8`, `M12` + Firewall Table | `M2.1`, `M8.1`, `M8.4` (SaaS Tenant Isolation, SSO & Egress IP), `M12.1` (DMZ Reverse Proxy) |
| **P1** | What are you bringing for review? | Always shown | **RPA / bot / automated process** (`rpa_process`) | Unlocks Checklist | `rpa_in_scope=true`, Flag: `non_human_identity_present` | `M2`, `M9` | `M2.2` (CyberArk Vault), `M9.1` (RPA Bot Execution Mode & Vault), `M9.2` (Hardened Runner VDI & Auto-Wipe) |
| **P1** | What are you bringing for review? | Always shown | **Data migration or bulk copy** (`data_migration`) | Unlocks Checklist | `migration_in_scope=true` | `M4`, `M13` | `M4.1` (Encryption at Rest), `M13.1` (Migration TLS & SHA-256 Reconciliation), `M13.2` (Staging Sanitization & Crypto-Shred) |
| **P1** | What are you bringing for review? | Always shown | **Infrastructure, cloud or network change** (`infra_cloud_network`) | Unlocks Checklist | `infra_change_in_scope=true` | `M3`, `M10` *(if On-Prem)*, `M11` *(if Cloud)*, `M12`, `M16` | `M3.1`, `M3.2`, `M10.1` (CIS Golden Image), `M11.1` (Cloud Landing Zone), `M12.1` (Perimeter Exposure), `M16.1`, `M16.2` |
| **P2** | Has this application been reviewed by Security (SAR) before? *(Single-Select)* | `P1` includes `enhancement` | **Yes** (`yes`) | Fact-Only | `prior_sar=yes` *( Enables Scope Narrowing if P3=minor)* | None | Captures prior review baseline; enables Minor Enhancement Scope Narrowing when paired with `P3=minor`. |
| **P2** | Has this application been reviewed by Security (SAR) before? | `P1` includes `enhancement` | **No** (`no`) | Unlocks Checklist | `prior_sar=no` | `M1`, `M2`, `M3` | `M1.1`, `M1.2`, `M2.1`, `M3.1` (Requires baseline architecture review since no prior SAR exists). |
| **P2** | Has this application been reviewed by Security (SAR) before? | `P1` includes `enhancement` | **Not sure** (`not_sure`) | Unlocks Checklist | `prior_sar=unknown` | `M1`, `M3` | `M1.1`, `M3.1` (Fail-open verification of baseline architecture). |
| **P3** | How big is this change? *(Single-Select)* | `P1` includes `enhancement` | **Minor — small feature, UI or config tweak** (`minor`) | Scope Filter | `change_size=minor`, Flag: `scope_narrowed` *(if P2=yes & 0 overrides)* | Narrows to `P4` | Activates **Minor Enhancement Scope Narrowing** (suppresses unrelated modules not selected in `P4`). |
| **P3** | How big is this change? | `P1` includes `enhancement` | **Major — new module, new architecture, or new integration** (`major`) | Unlocks Checklist | `change_size=major` | `M1`, `M2`, `M3`, `M16` | `M1.1`, `M1.2`, `M2.1`, `M3.1`, `M3.2`, `M16.1` (Full architectural domain evaluation). |
| **P4** | Which parts of the application are changing? *(Multi-Select)* | `P1` includes `enhancement` | **User interface (UI)** (`ui`) | Unlocks Checklist | `changed_ui=true` | `M1` | `M1.1`, `M1.2`, **`M1.3`** (Browser Security Headers: CSP, HSTS, Secure Cookies, Anti-CSRF). |
| **P4** | Which parts of the application are changing? | `P1` includes `enhancement` | **APIs** (`apis`) | Unlocks Checklist | `changed_apis=true` | `M5` + API Endpoints Table | `M5.1` (API Auth mTLS/OAuth2), `M5.2` (Gateway Rate Limiting & Schema Validation). |
| **P4** | Which parts of the application are changing? | `P1` includes `enhancement` | **Database or storage** (`database`) | Unlocks Checklist | `changed_db=true` | `M4`, `M16` | `M4.1` (Encryption at Rest AES-256), `M16.2` (DR & Immutable Backups). |
| **P4** | Which parts of the application are changing? | `P1` includes `enhancement` | **Login, roles or access** (`login_access`) | Unlocks Checklist | `changed_auth=true` | `M2` | `M2.1` (Enterprise SSO & MFA), `M2.2` (Secrets Vault). |
| **P4** | Which parts of the application are changing? | `P1` includes `enhancement` | **Integrations** (`integrations`) | Unlocks Checklist | `changed_integrations=true` | `M3`, `M5` + Integrations Table | `M3.1`, `M3.2`, `M5.1`, `M5.2`. |
| **P4** | Which parts of the application are changing? | `P1` includes `enhancement` | **Servers, cloud or network** (`servers_hosting`) | Unlocks Checklist | `changed_infra=true` | `M10`, `M11`, `M12` + Server & Firewall Tables | `M10.1` (CIS Golden Image), `M11.1` (Cloud Landing Zone), `M12.1` (Perimeter Exposure). |
| **P4** | Which parts of the application are changing? | `P1` includes `enhancement` | **Data flows** (`data_flows`) | Unlocks Checklist | `changed_data_flows=true` | `M3`, `M4` | `M3.2` (Trust Boundary Data Flow), `M4.1` (At-Rest Encryption), `M4.3` (In-Transit TLS 1.2/1.3). |
| **P4** | Which parts of the application are changing? | `P1` includes `enhancement` | **Reports or exports** (`reports`) | Unlocks Checklist | `changed_reports=true` | `M4` | **`M4.5`** (Bulk Data Export DLP, Masking, Watermarking & Audit Logging). |

---

### Stage 2: Where will it run? (`P5`–`P7`)

| Code | Question Text | Prerequisite (`Show Only If`) | Option Label (`id`) | Behavior | Derived Flags / Facts Set | Unlocked Sections & Repeater Tables | Unlocked / Converged Detailed Checklist Controls (`M1.1`–`M16.2`) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **P5** | Where will this be hosted? *(Single-Select)* | Always shown | **Bank data centre (On-Prem)** (`bank_dc`) | Fact / Conditional | `hosting=on_prem`, Flag: `on_prem_hosted` | `M10` *(when paired with P1=new_app/infra, P4=servers_hosting, or P27=yes)* | Captures On-Premises hosting fact; unlocks `M10.1` when servers/infra are in scope; keeps `M11` Cloud hidden. |
| **P5** | Where will this be hosted? | Always shown | **Bank AWS cloud** (`bank_aws`) | Unlocks Checklist | `hosting=bank_aws`, Flag: `cloud_hosted` | `M11` | `M11.1` (Bank Cloud Landing Zone, Private Subnets, GuardDuty/CSPM). |
| **P5** | Where will this be hosted? | Always shown | **Other cloud (Azure / GCP / OCI)** (`other_cloud`) | Unlocks Checklist | `hosting=other_cloud`, Flag: `cloud_hosted` | `M11` | `M11.1` (Cloud Landing Zone & CSPM), `M11.2` (Cloud Storage Public Block, KMS CMK & IAM Roles). |
| **P5** | Where will this be hosted? | Always shown | **Vendor cloud / SaaS** (`vendor_saas`) | Unlocks Checklist | `hosting=vendor_saas`, Flags: `external_party_involved`, `vendor_involved` | `M8`, `M12` | `M8.1` (Vendor SOC2/ISO27001), `M8.4` (SaaS Tenant Isolation, SAML/OIDC SSO & IP Whitelisting), `M12.1`. |
| **P5** | Where will this be hosted? | Always shown | **Hybrid (On-Prem + Cloud)** (`hybrid`) | Unlocks Checklist | `hosting=hybrid`, Flags: `hybrid`, `on_prem_hosted`, `cloud_hosted` | `M10`, `M11`, `M12` + Server & Firewall Tables | `M10.1` (On-Prem CIS Image), `M11.1` (Cloud Landing Zone), `M12.1` (Cross-Environment Network Boundary). |
| **P5** | Where will this be hosted? | Always shown | **Not decided yet** (`not_decided`) | Unlocks Checklist | `hosting=unknown`, Flags: `on_prem_hosted`, `cloud_hosted` | `M10`, `M11` | `M10.1`, `M11.1` (Fail-open until target hosting model is finalized). |
| **P6** | Which environments are in scope? *(Multi-Select)* | Always shown | **Production** (`production`) | Unlocks Checklist | `env_prod=true` | `M16` | `M16.1` (Central SOC SIEM Audit Logging). |
| **P6** | Which environments are in scope? | Always shown | **DR (Disaster Recovery)** (`dr`) | Unlocks Checklist | `env_dr=true` | `M16` | `M16.1` (SOC SIEM Logging), `M16.2` (DR Topology, RPO/RTO & Failover Drills — **Mandatory**). |
| **P6** | Which environments are in scope? | Always shown | **UAT / Pre-Prod** (`uat`) | Unlocks Checklist | `env_uat=true` | `M4` *(when P19=yes)* | **`M4.2`** (Production Data Masking / Synthetic Data in UAT & Dev). |
| **P6** | Which environments are in scope? | Always shown | **Development / Testing** (`development`) | Unlocks Checklist | `env_dev=true` | `M4` *(when P19=yes)* | **`M4.2`** (Production Data Masking / Synthetic Data in UAT & Dev). |
| **P7** | Who builds and operates it? *(Single-Select)* | Always shown | **Built & run by our bank (In-house)** (`in_house`) | Fact-Only | `ownership=in_house` | None | Captures 100% internal ownership fact — keeps `M8` Vendor Governance hidden. |
| **P7** | Who builds and operates it? | Always shown | **Vendor builds it, bank runs it** (`vendor_builds_bank_runs`) | Unlocks Checklist | `ownership=vendor_build`, Flags: `vendor_involved`, `external_party_involved` | `M8` | `M8.1` (Vendor TPRM), **`M8.2`** (Vendor Source Code Delivery, Bank Repo SAST/SCA & Zero Hardcoded Backdoors). |
| **P7** | Who builds and operates it? | Always shown | **Vendor builds and runs it for us** (`vendor_builds_and_runs`) | Unlocks Checklist | `ownership=vendor_managed`, Flags: `vendor_involved`, `external_party_involved` | `M8`, `M12` | `M8.1` (SOC2/ISO27001), `M8.2` (Code & Build Integrity), **`M8.3`** (Vendor PAM Jump-Host & Session Recording), `M12.3`. |
| **P7** | Who builds and operates it? | Always shown | **Vendor SaaS (subscription)** (`vendor_saas_sub`) | Unlocks Checklist | `ownership=vendor_saas`, Flags: `vendor_involved`, `external_party_involved` | `M8`, `M12` | `M8.1` (SOC2/ISO27001), **`M8.4`** (SaaS Tenant Isolation, SSO & Egress IP Allowlisting). |

---

### Stage 3: Who will use it & how will they access it? (`P8`–`P12`)

| Code | Question Text | Prerequisite (`Show Only If`) | Option Label (`id`) | Behavior | Derived Flags / Facts Set | Unlocked Sections & Repeater Tables | Unlocked / Converged Detailed Checklist Controls (`M1.1`–`M16.2`) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **P8** | Who will use this application? *(Multi-Select)* | Always shown | **Bank employees (internal staff)** (`bank_employees`) | Unlocks Checklist | `user_employees=true` | `M2` | `M2.1` (Enterprise IdP SAML/OIDC SSO & MFA). |
| **P8** | Who will use this application? | Always shown | **Retail / individual customers** (`customers`) | Unlocks + Override | `user_customers=true`, Flags: `internet_facing`, `customer_facing_with_sensitive_data` | `M2`, `M12` + Firewall Table | `M2.1`, **`M2.4`** (Customer CIAM, Device Binding & Step-Up MFA — **Hard-Required**), **`M12.2`** (WAF, DDoS & Bot Mitigation — **Hard-Required**). |
| **P8** | Who will use this application? | Always shown | **Corporate clients / Business Correspondents (BC)** (`corporates_bc`) | Unlocks Checklist | `user_corporates=true`, Flag: `internet_facing` | `M2`, `M12` + Firewall Table | `M2.1`, **`M2.4`** (Customer/Corporate CIAM & Transaction Signing), **`M12.2`** (WAF & DDoS Protection). |
| **P8** | Who will use this application? | Always shown | **Partner or vendor staff** (`partner_vendor_staff`) | Unlocks + Override | `user_partners=true`, Flags: `external_party_involved`, `vendor_involved` | `M2`, `M8`, `M12` | `M2.1`, **`M8.3`** (Vendor Remote Access via PAM Jump-Host), **`M12.3`** (Partner DMZ Termination & IPsec VPN). |
| **P8** | Who will use this application? | Always shown | **System / privileged admins** (`privileged_admins`) | Unlocks Checklist | `user_admins=true` | `M2` | `M2.1`, **`M2.3`** (Privileged Access Maker-Checker, PAM Bastion & Session Recording — **Mandatory**). |
| **P9** | How will users interact with it? *(Multi-Select)* | Always shown | **Web browser** (`web_browser`) | Unlocks Checklist | `channel_web=true` | `M1` | **`M1.3`** (Browser Security Headers: Strict CSP, HSTS, SameSite Cookies, Anti-CSRF). |
| **P9** | How will users interact with it? | Always shown | **Mobile app (iOS / Android)** (`mobile_app`) | Unlocks Checklist | `channel_mobile=true` | `M14` | **`M14.1`** (Mobile Certificate Pinning, Root/Jailbreak RASP & Obfuscation — **Hard-Required**). |
| **P9** | How will users interact with it? | Always shown | **Desktop / thick client app** (`desktop_app`) | Unlocks Checklist | `channel_desktop=true` | `M14` | **`M14.2`** (Thick-Client Code Signing, Auto-Update Verification & Zero Local Secrets). |
| **P9** | How will users interact with it? | Always shown | **Command line / admin console** (`cli`) | Unlocks Checklist | `channel_cli=true` | `M2` | **`M2.3`** (Privileged CLI PAM Jump-Host & Keystroke Logging). |
| **P9** | How will users interact with it? | Always shown | **Remote desktop / VDI / jump host** (`rdp_vdi`) | Unlocks Checklist | `channel_vdi=true` | `M2`, `M8` | **`M2.3`** (PAM Bastion), **`M8.3`** (Vendor VDI Session Recording). |
| **P9** | How will users interact with it? | Always shown | **Branch kiosk / POS / ATM device** (`kiosk`) | Unlocks Checklist | `channel_kiosk=true` | `M12`, `M14` | `M12.1` (Network Isolation), **`M14.2`** (Kiosk OS Lockdown, Binary Signing & Local Wipe). |
| **P9** | How will users interact with it? | Always shown | **No human users — system-to-system only (Exclusive)** (`no_human_users`) | Fact-Only | `channel_headless=true` | None | Suppresses browser/mobile UI questions; relies on Stage 3 `P11` and Stage 4 `P14` machine channels. |
| **P10** | From which networks can it be reached? *(Multi-Select)* | Always shown | **Bank internal / corporate network** (`corporate_network`) | Fact-Only | `net_internal=true` | None | Captures internal LAN reachability fact only — does not unlock external WAF/DMZ questions. |
| **P10** | From which networks can it be reached? | Always shown | **Bank VPN** (`vpn`) | Unlocks Checklist | `net_vpn=true` | `M2` | `M2.1` (VPN + Enterprise SSO/MFA Enforcement). |
| **P10** | From which networks can it be reached? | Always shown | **Public internet** (`internet`) | Unlocks + Override | `net_internet=true`, Flag: `internet_facing` | `M12`, `M3` + Firewall Table | `M3.1`, `M12.1` (DMZ Termination), **`M12.2`** (External WAF, DDoS & Bot Protection — **Hard-Required**). |
| **P10** | From which networks can it be reached? | Always shown | **Partner / vendor network (leased line / VPN)** (`partner_network`) | Unlocks + Override | `net_partner=true`, Flags: `external_party_involved`, `new_trust_boundary_crossing` | `M12`, `M3` + Firewall Table | `M3.1`, `M12.1`, **`M12.3`** (Partner DMZ Termination, IPsec/MPLS & Source IP Whitelisting — **Mandatory**). |
| **P11** | Are there non-human (system) accounts or bots? *(Multi-Select)* | Always shown | **Service accounts / batch jobs** (`service_accounts`) | Unlocks Checklist | `nhi_service=true`, Flag: `non_human_identity_present` | `M2` | **`M2.2`** (Secrets Vault / KMS Rotation & Zero Cleartext Config Secrets — **Mandatory**). |
| **P11** | Are there non-human (system) accounts or bots? | Always shown | **API clients / OAuth apps** (`api_clients`) | Unlocks Checklist | `nhi_api=true`, Flag: `non_human_identity_present` | `M2`, `M5` | **`M2.2`** (Vault Rotation), **`M5.1`** (mTLS / OAuth2 Client Credentials). |
| **P11** | Are there non-human (system) accounts or bots? | Always shown | **RPA bots** (`rpa_bots`) | Unlocks Checklist | `nhi_rpa=true`, Flags: `non_human_identity_present`, `rpa_in_scope` | `M2`, `M9` | **`M2.2`** (CyberArk Credential Injection), **`M9.1`** (RPA Bot Mode), **`M9.2`** (VDI Auto-Wipe). |
| **P11** | Are there non-human (system) accounts or bots? | Always shown | **Microservices (service-to-service)** (`microservices`) | Unlocks Checklist | `nhi_mesh=true`, Flag: `non_human_identity_present` | `M2`, `M5`, `M10` | **`M2.2`** (Short-Lived Workload Certs), **`M5.1`** (Service Mesh mTLS), **`M10.2`** (Container Hardening). |
| **P11** | Are there non-human (system) accounts or bots? | Always shown | **Database / privileged technical accounts** (`db_accounts`) | Unlocks Checklist | `nhi_db=true`, Flag: `non_human_identity_present` | `M2` | **`M2.2`** (Vault-Managed DB Credentials), **`M2.3`** (Privileged DB Session Recording). |
| **P11** | Are there non-human (system) accounts or bots? | Always shown | **None (Exclusive)** (`none`) | Fact-Only | `nhi_none=true` | None | Captures fact only — keeps non-human secret vaulting (`M2.2`) and RPA (`M9`) hidden. |
| **P12** | Can any part be used without logging in (anonymous / public)? *(Single-Select)* | Always shown | **Yes** (`yes`) | Unlocks Checklist | `anonymous_access=yes` | `M2`, `M12` | **`M2.5`** (Public Endpoint Isolation, CAPTCHA/Bot Throttling — **Hard-Required**), **`M12.2`** (WAF/DDoS). |
| **P12** | Can any part be used without logging in (anonymous / public)? | Always shown | **No** (`no`) | Fact-Only | `anonymous_access=no` | None | Captures authenticated-only posture — keeps `M2.5` hidden. |
| **P12** | Can any part be used without logging in (anonymous / public)? | Always shown | **Not sure** (`not_sure`) | Unlocks Checklist | `anonymous_access=unknown` | `M2` | **`M2.5`** (Fail-open verification of unauthenticated routes). |

---

### Stage 4: What does it connect to? (`P13`–`P18`)

| Code | Question Text | Prerequisite (`Show Only If`) | Option Label (`id`) | Behavior | Derived Flags / Facts Set | Unlocked Sections & Repeater Tables | Unlocked / Converged Detailed Checklist Controls (`M1.1`–`M16.2`) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **P13** | Does it connect to other applications or services? *(Single-Select)* | Always shown | **No — standalone** (`no`) | Fact-Only | `connects=no` *(Hides P14, P15, P16)* | None | Suppresses `P14`, `P15`, `P16` and keeps `M5`, `M6`, `M7` integration modules hidden. |
| **P13** | Does it connect to other applications or services? | Always shown | **Yes — only internal bank systems** (`internal_only`) | Unlocks Checklist | `connects=internal` *(Reveals P14, P15, P16)* | `M3` + Integrations Table | `M3.1`, `M3.2` (Internal Architecture & Data Flow) + reveals `P14`, `P15`, `P16`. |
| **P13** | Does it connect to other applications or services? | Always shown | **Yes — external partners, vendors or public APIs** (`external_only`) | Unlocks Checklist | `connects=external`, Flag: `external_party_involved` | `M3`, `M5`, `M12` + API & Integrations Tables | `M3.1`, `M3.2`, `M5.1`, `M5.2`, `M12.1`, **`M12.3`** (Partner DMZ Termination). |
| **P13** | Does it connect to other applications or services? | Always shown | **Yes — both internal and external systems** (`both`) | Unlocks Checklist | `connects=both`, Flag: `external_party_involved` | `M3`, `M5`, `M12` + API & Integrations Tables | `M3.1`, `M3.2`, `M5.1`, `M5.2`, `M12.1`, **`M12.3`**. |
| **P13** | Does it connect to other applications or services? | Always shown | **Not sure** (`not_sure`) | Unlocks Checklist | `connects=unknown`, Flag: `external_party_involved` | `M3`, `M5` | `M3.1`, `M5.1` + reveals `P14`, `P15`, `P16`. |
| **P14** | How does it exchange data with those systems? *(Multi-Select)* | `P13` is NOT `no` | **REST / GraphQL / gRPC / SOAP APIs** (`rest_api`) | Unlocks Checklist | `proto_api=true` | `M5` + API Endpoints Table | **`M5.1`** (mTLS / OAuth2 API Auth), **`M5.2`** (Gateway Rate Limiting & Schema Validation). |
| **P14** | How does it exchange data with those systems? | `P13` is NOT `no` | **Webhooks / callbacks** (`webhooks`) | Unlocks Checklist | `proto_webhooks=true` | `M5`, `M7` | `M5.1`, **`M7.2`** (Webhook HMAC-SHA256 Signature, Timestamp Replay Window & Egress Proxy — **Mandatory**). |
| **P14** | How does it exchange data with those systems? | `P13` is NOT `no` | **Message queues or event streams (Kafka / MQ)** (`queues_streams`) | Unlocks Checklist | `proto_queues=true` | `M7` | **`M7.1`** (Kafka/MQ TLS Encryption, Per-Topic ACLs & Dead-Letter Queue Poison Handling — **Mandatory**). |
| **P14** | How does it exchange data with those systems? | `P13` is NOT `no` | **File transfer / batch (SFTP / FTPS / S3)** (`file_transfer`) | Unlocks Checklist | `proto_files=true`, Flag: `external_file_transfer` *(if external)* | `M6` | **`M6.1`** (SFTP SSH-Key Auth & PGP Payload Encryption), **`M6.2`** (DMZ Staging Malware Scan & Internal Pull — **Hard-Required** if external). |
| **P14** | How does it exchange data with those systems? | `P13` is NOT `no` | **Shared database or direct DB connection** (`db_connection`) | Unlocks Checklist | `proto_db=true` | `M4`, `M5` | `M4.1`, **`M5.3`** (Direct DB JDBC TLS, Scoped Read-Only Views & Service Layer Justification — **Mandatory**). |
| **P14** | How does it exchange data with those systems? | `P13` is NOT `no` | **Email / SMTP / SMS gateway** (`email_smtp`) | Unlocks Checklist | `proto_smtp=true` | `M5` | **`M5.4`** (Enterprise SMTP Relay, SPF/DKIM/DMARC & Outbound DLP Inspection — **Mandatory**). |
| **P14** | How does it exchange data with those systems? | `P13` is NOT `no` | **Proprietary / custom socket protocol** (`custom_protocol`) | Unlocks Checklist | `proto_custom=true` | `M5`, `M12` | **`M5.5`** (Custom Socket TLS Wrapping, Framing Bounds & Fuzz Testing — **Mandatory**), `M12.1`. |
| **P15** | Does any connection cross a boundary (internal ↔ DMZ, cloud, or external)? *(Single-Select)* | `P13` is NOT `no` | **Yes** (`yes`) | Unlocks + Override | `boundary_crossed=yes`, Flag: `new_trust_boundary_crossing` | `M3`, `M12` + Firewall Table | `M3.1`, **`M3.2`** (Trust Boundary Data Flow — **Mandatory**), **`M12.1`** (Perimeter/DMZ Exposure — **Mandatory**). |
| **P15** | Does any connection cross a boundary? | `P13` is NOT `no` | **No (same security zone)** (`no`) | Fact-Only | `boundary_crossed=no` | None | Captures intra-zone communication fact without forcing cross-zone firewall gates. |
| **P15** | Does any connection cross a boundary? | `P13` is NOT `no` | **Not sure** (`not_sure`) | Unlocks + Override | `boundary_crossed=unknown`, Flag: `new_trust_boundary_crossing` | `M3`, `M12` | `M3.1`, `M3.2`, `M12.1` (Fail-open network zone verification). |
| **P16** | Are any APIs exposed outside the application? *(Single-Select)* | `P13` is NOT `no` | **Yes — via Bank API Gateway** (`yes_gateway`) | Unlocks Checklist | `api_exposed=gateway` | `M5` + API Endpoints Table | `M5.1` (mTLS/OAuth2), `M5.2` (Gateway Throttling & Schema Validation). |
| **P16** | Are any APIs exposed outside the application? | `P13` is NOT `no` | **Yes — directly (not via API Gateway)** (`yes_direct`) | Unlocks Checklist | `api_exposed=direct` | `M5`, `M12` + API & Firewall Tables | `M5.1`, `M5.2`, **`M5.6`** (Direct API Gateway Bypass Exception & Compensating Controls — **Hard-Required**), `M12.1`. |
| **P16** | Are any APIs exposed outside the application? | `P13` is NOT `no` | **No** (`no`) | Fact-Only | `api_exposed=no` | None | Captures consumer-only fact — keeps `M5.6` hidden. |
| **P16** | Are any APIs exposed outside the application? | `P13` is NOT `no` | **Not sure** (`not_sure`) | Unlocks Checklist | `api_exposed=unknown` | `M5` | `M5.1`, `M5.2` (Fail-open API ingress verification). |
| **P17** | Does this need new firewall rules or new network ports? *(Single-Select)* | Always shown | **Yes** (`yes`) | Unlocks + Override | `new_firewall=yes`, Flag: `new_trust_boundary_crossing` | `M3`, `M12` + Firewall Rules Table | `M3.1`, **`M12.1`** (Network Exposure & Zero Any-Any Firewall Rules — **Mandatory** + Firewall Port Matrix Table). |
| **P17** | Does this need new firewall rules or new network ports? | Always shown | **No** (`no`) | Fact-Only | `new_firewall=no` | None | Captures existing-network fact — does not unlock `M12` unless internet/partner/boundary triggers fire. |
| **P17** | Does this need new firewall rules or new network ports? | Always shown | **Not sure** (`not_sure`) | Unlocks + Override | `new_firewall=unknown`, Flag: `new_trust_boundary_crossing` | `M3`, `M12` + Firewall Rules Table | `M3.1`, `M12.1` (Fail-open firewall rule check). |
| **P18** | Does it introduce a new vendor or third-party connection? *(Single-Select)* | Always shown | **Yes** (`yes`) | Unlocks + Override | `new_vendor_conn=yes`, Flags: `external_party_involved`, `vendor_involved` | `M3`, `M8`, `M12` | **`M8.1`** (Vendor SOC2/ISO27001), **`M8.3`** (Vendor PAM Access), **`M12.3`** (Partner DMZ & IPsec VPN). |
| **P18** | Does it introduce a new vendor or third-party connection? | Always shown | **No** (`no`) | Fact-Only | `new_vendor_conn=no` | None | Captures fact only. |
| **P18** | Does it introduce a new vendor or third-party connection? | Always shown | **Not sure** (`not_sure`) | Unlocks + Override | `new_vendor_conn=unknown`, Flags: `external_party_involved`, `vendor_involved` | `M8`, `M12` | `M8.1`, `M12.3` (Fail-open third-party connectivity check). |

---

### Stage 5: What data is involved? (`P19`–`P26`)

| Code | Question Text | Prerequisite (`Show Only If`) | Option Label (`id`) | Behavior | Derived Flags / Facts Set | Unlocked Sections & Repeater Tables | Unlocked / Converged Detailed Checklist Controls (`M1.1`–`M16.2`) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **P19** | Does this touch any bank or customer data? *(Single-Select)* | Always shown | **Yes** (`yes`) | Unlocks Checklist | `touches_data=yes` *(Reveals P20–P24)* | `M4` | **`M4.1`** (Encryption at Rest AES-256 & KMS CMK — **Mandatory**) + reveals `P20`, `P21`, `P22`, `P23`, `P24`. |
| **P19** | Does this touch any bank or customer data? | Always shown | **No** (`no`) | Fact-Only | `touches_data=no` *(Hides P20–P24)* | None | Suppresses `P20`–`P24` and keeps `M4` Data Protection hidden. |
| **P20** | What is the highest sensitivity of data involved? *(Single-Select)* | `P19` = `yes` | **Public** (`public`) | Fact-Only | `data_sensitivity=public` | None | Captures public classification fact — does not elevate encryption/DLP controls. |
| **P20** | What is the highest sensitivity of data involved? | `P19` = `yes` | **Internal** (`internal`) | Fact-Only | `data_sensitivity=internal` | None | Baseline internal classification. |
| **P20** | What is the highest sensitivity of data involved? | `P19` = `yes` | **Confidential** (`confidential`) | Unlocks Checklist | `data_sensitivity=confidential` | `M4` | `M4.1` (AES-256 Encryption at Rest), `M4.3` (TLS 1.2/1.3 in Transit). |
| **P20** | What is the highest sensitivity of data involved? | `P19` = `yes` | **Sensitive / Restricted / Secret** (`sensitive`) | Unlocks Checklist | `data_sensitivity=sensitive`, Flag: `customer_facing_with_sensitive_data` *(if P8=cust)* | `M4`, `M16` | `M4.1` (**Hard-Required**), `M4.2` (UAT Masking), `M4.3` (TLS 1.3 + Payload Signing), `M16.1` (SIEM Logging). |
| **P20** | What is the highest sensitivity of data involved? | `P19` = `yes` | **Not sure** (`not_sure`) | Unlocks Checklist | `data_sensitivity=unknown` | `M4` | `M4.1`, `M4.3` (Fail-open encryption verification). |
| **P21** | Which types of data are involved? *(Multi-Select)* | `P19` = `yes` | **Personal data (PII — Aadhaar, PAN, Mobile, Email, KYC)** (`pii`) | Unlocks + Override | `data_pii=true`, Flag: `pii_or_pci_in_scope` | `M4` | `M4.1`, `M4.2` (Non-Prod Masking), **`M4.4`** (DPDP Consent, Field Encryption & Automated Retention Purge — **Mandatory**). |
| **P21** | Which types of data are involved? | `P19` = `yes` | **Card / payment data (PCI — PAN, CVV, PIN block)** (`pci`) | Unlocks + Override | `data_pci=true`, Flag: `pii_or_pci_in_scope` | `M4` | `M4.1`, **`M4.6`** (PCI-DSS v4.0 CDE Segmentation, Format-Preserving Tokenization & Hardware HSM — **Hard-Required**). |
| **P21** | Which types of data are involved? | `P19` = `yes` | **Financial / account / transaction records** (`financial`) | Unlocks Checklist | `data_financial=true` | `M4`, `M16` | `M4.1` (Encryption at Rest), `M4.3` (In-Transit Integrity), `M16.1` (Immutable Financial Audit Logs). |
| **P21** | Which types of data are involved? | `P19` = `yes` | **Login secrets, tokens, keys or certificates** (`secrets_keys`) | Unlocks + Override | `data_secrets=true`, Flag: `non_human_identity_present` | `M2`, `M4` | **`M2.2`** (Enterprise Secrets Vault / HSM — **Mandatory**), `M4.1`. |
| **P21** | Which types of data are involved? | `P19` = `yes` | **Source code or intellectual property** (`source_code_ip`) | Unlocks Checklist | `data_ip=true` | `M1`, `M8` | `M1.2` (SAST/Repository Security), **`M8.2`** (Source Code Escrow & Build Integrity). |
| **P21** | Which types of data are involved? | `P19` = `yes` | **Logs, telemetry or audit trails** (`logs_telemetry`) | Unlocks Checklist | `data_logs=true` | `M16` | **`M16.1`** (Central SOC SIEM Forwarding & PII Scrubbing in Logs). |
| **P21** | Which types of data are involved? | `P19` = `yes` | **System configuration data only (Exclusive)** (`config_only`) | Fact-Only | `data_config_only=true` | None | Captures config-only scope — keeps PII/PCI controls (`M4.4`, `M4.6`) hidden. |
| **P22** | Where will this data exist? *(Multi-Select)* | `P19` = `yes` | **Stored in database or files (at rest)** (`at_rest_db_files`) | Unlocks Checklist | `loc_at_rest=true` | `M4` | **`M4.1`** (Database/Storage AES-256 Encryption & KMS Key Rotation). |
| **P22** | Where will this data exist? | `P19` = `yes` | **Sent over the network (in transit)** (`in_transit`) | Unlocks Checklist | `loc_in_transit=true` | `M4` | **`M4.3`** (TLS 1.2/1.3 & Payload-Level JWE/PGP Encryption). |
| **P22** | Where will this data exist? | `P19` = `yes` | **In backups or archives** (`in_backups`) | Unlocks Checklist | `loc_in_backups=true` | `M4`, `M16` | `M4.1`, **`M16.2`** (Encrypted Air-Gapped / Object-Lock Immutable Backups & DR). |
| **P22** | Where will this data exist? | `P19` = `yes` | **In application or security logs** (`in_logs`) | Unlocks Checklist | `loc_in_logs=true` | `M16` | **`M16.1`** (Log Sanitization / Token Masking & SIEM Forwarding — **Mandatory**). |
| **P22** | Where will this data exist? | `P19` = `yes` | **In cache or memory (Redis / Memcached)** (`in_cache`) | Unlocks Checklist | `loc_in_cache=true` | `M4` | **`M4.7`** (In-Memory Cache TLS, Auth ACLs, Encryption & Strict TTL Eviction — **Mandatory**). |
| **P22** | Where will this data exist? | `P19` = `yes` | **On user devices or browser storage** (`on_device`) | Unlocks Checklist | `loc_on_device=true` | `M1`, `M14` | **`M1.3`** (Zero Sensitive Browser Storage), **`M14.1`** (Mobile Keychain/Keystore Hardware Enclave). |
| **P23** | Roughly how many customer / user records are in scope? *(Single-Select)* | `P19` = `yes` | **None** (`none`) | Fact-Only | `record_volume=none` | None | Captures zero-record fact — keeps `M4.8` hidden. |
| **P23** | Roughly how many customer / user records are in scope? | `P19` = `yes` | **Under 10,000** (`under_10k`) | Fact-Only | `record_volume=under_10k` | None | Low-volume fact — keeps mass-exfiltration DAM (`M4.8`) hidden. |
| **P23** | Roughly how many customer / user records are in scope? | `P19` = `yes` | **10,000 to 1 Million** (`10k_to_1m`) | Unlocks Checklist | `record_volume=10k_to_1m` | `M4` | **`M4.8`** (Database Activity Monitoring [DAM], Pagination Caps & Bulk-Query Throttling — **Mandatory**). |
| **P23** | Roughly how many customer / user records are in scope? | `P19` = `yes` | **Over 1 Million** (`over_1m`) | Unlocks Checklist | `record_volume=over_1m` | `M4`, `M16` | **`M4.8`** (DAM & Anti-Scraping — **Mandatory**), **`M16.1`** (High-Volume SIEM Alerting), **`M16.2`** (DR). |
| **P23** | Roughly how many customer / user records are in scope? | `P19` = `yes` | **Not sure** (`not_sure`) | Unlocks Checklist | `record_volume=unknown` | `M4` | **`M4.8`** (Fail-open until data volume is sized). |
| **P24** | Will any data be stored or processed outside India? *(Single-Select)* | `P19` = `yes` | **Yes (stored or processed outside India)** (`yes`) | Unlocks Checklist | `outside_india=yes`, Flag: `cloud_hosted` | `M4`, `M11` | **`M4.9`** (RBI Payment Data Localization & DPDP Cross-Border DPO Sign-Off — **Hard-Required**), `M11.1`. |
| **P24** | Will any data be stored or processed outside India? | `P19` = `yes` | **No (strictly within India regions)** (`no`) | Fact-Only | `outside_india=no` | None | Captures India-only residency fact — keeps `M4.9` hidden. |
| **P24** | Will any data be stored or processed outside India? | `P19` = `yes` | **Not sure** (`not_sure`) | Unlocks Checklist | `outside_india=unknown`, Flag: `cloud_hosted` | `M4`, `M11` | **`M4.9`** (Fail-open verification of cloud/SaaS sub-processor regions). |
| **P25** | Is data being migrated or copied into a new place? *(Single-Select)* | Always shown | **Yes** (`yes`) | Unlocks Checklist | `data_migrated=yes` | `M13`, `M4` | **`M13.1`** (Migration In-Flight TLS & SHA-256 Checksum Reconciliation — **Mandatory**), **`M13.2`** (Staging Wipe within 7 Days). |
| **P25** | Is data being migrated or copied into a new place? | Always shown | **No** (`no`) | Fact-Only | `data_migrated=no` | None | Captures fact only — keeps `M13` hidden (unless selected in `P1`). |
| **P26** | Any regulatory driver? *(Multi-Select)* | Always shown | **RBI guidelines** (`rbi_guidelines`) | Unlocks Checklist | `regulation=rbi` | `M16` | **`M16.1`** (Central SOC SIEM Audit Logging & 5-Year Tamper-Evident Retention — **Mandatory**). |
| **P26** | Any regulatory driver? | Always shown | **PCI-DSS v4.0** (`pci_dss`) | Unlocks Checklist | `regulation=pci_dss`, Flag: `pii_or_pci_in_scope` | `M4` | **`M4.6`** (PCI CDE Segmentation & Hardware HSM Tokenization — **Hard-Required**). |
| **P26** | Any regulatory driver? | Always shown | **Data protection law (DPDP Act)** (`dpdp_law`) | Unlocks Checklist | `regulation=dpdp` | `M4` | **`M4.4`** (DPDP Consent Notice, Purpose Limitation & Right-to-Erasure Purge — **Mandatory**). |
| **P26** | Any regulatory driver? | Always shown | **Other regulatory mandate (SEBI / IRDAI / UIDAI)** (`other`) | Fact-Only | `regulation=other_reg` | None | Captures regulatory context for reviewer sign-off. |
| **P26** | Any regulatory driver? | Always shown | **None or not sure (Exclusive)** (`none_or_not_sure`) | Fact-Only | Baseline policy | None | Standard bank security policy applies. |

---

### Stage 6: Anything new? (`P27`–`P30`)

| Code | Question Text | Prerequisite (`Show Only If`) | Option Label (`id`) | Behavior | Derived Flags / Facts Set | Unlocked Sections & Repeater Tables | Unlocked / Converged Detailed Checklist Controls (`M1.1`–`M16.2`) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **P27** | Does it need new servers, containers or databases? *(Single-Select)* | Always shown | **Yes** (`yes`) | Unlocks Checklist | `new_infra=yes` | `M10` + Servers & VMs Inventory Table | **`M10.1`** (CIS Hardened Golden Image & EDR/FIM Agents — **Mandatory**), **`M10.2`** (Non-Root Containers, Signed Images & DB Hardening — **Mandatory**). |
| **P27** | Does it need new servers, containers or databases? | Always shown | **No (uses existing pre-hardened infrastructure)** (`no`) | Fact-Only | `new_infra=no` | None | Captures existing-infrastructure fact — avoids unnecessary `M10` server hardening questions on software-only updates. |
| **P27** | Does it need new servers, containers or databases? | Always shown | **Not sure** (`not_sure`) | Unlocks Checklist | `new_infra=unknown` | `M10` + Servers Table | **`M10.1`** (Fail-open until infrastructure sizing is confirmed). |
| **P28** | Does it include AI or an LLM component? *(Single-Select)* | Always shown | **No** (`no`) | Fact-Only | `ai_scope=no` | None | Keeps entire `M15` AI & LLM Security module hidden. |
| **P28** | Does it include AI or an LLM component? | Always shown | **Yes — Bank-hosted model (runs in bank VPC/DC)** (`yes_bank_hosted`) | Unlocks + Override | `ai_scope=bank_hosted`, Flag: `ai_or_llm_present` | `M15` | **`M15.1`** (Prompt Injection Guardrails, PII Redaction & Human-in-the-Loop — **Hard-Required**), **`M15.2`** (RAG ACL Enforcement & Tool Sandboxing — **Mandatory**). *(Keeps `M15.3` External Provider hidden!)* |
| **P28** | Does it include AI or an LLM component? | Always shown | **Yes — Third-party / external AI service** (`yes_third_party`) | Unlocks + Override | `ai_scope=third_party`, Flags: `ai_or_llm_present`, `external_ai_present`, `external_party_involved` | `M15`, `M8` | **`M15.1`** (**Hard-Required**), **`M15.2`** (**Mandatory**), **`M15.3`** (External LLM Zero-Data-Retention Contract & PII Proxy — **Hard-Required**), **`M8.1`** (Vendor TPRM). |
| **P28** | Does it include AI or an LLM component? | Always shown | **Not sure** (`not_sure`) | Unlocks + Override | `ai_scope=unknown`, Flags: `ai_or_llm_present`, `external_ai_present` | `M15` | **`M15.1`**, **`M15.2`**, **`M15.3`** (Fail-open full AI governance check). |
| **P29** | Any known security exceptions or special constraints? *(Single-Select)* | Always shown | **Yes** (`yes`) | Unlocks Checklist | `has_exceptions=yes` | `M1` | `M1.1`, `M1.2` (Flags security exception / compensating control review in `M17`). |
| **P29** | Any known security exceptions or special constraints? | Always shown | **No** (`no`) | Fact-Only | `has_exceptions=no` | None | Captures zero-exception compliance posture. |
| **P30** | Anything else the security reviewer should know? *(Free-Text)* | Always shown | **Optional architectural notes** (`free_text`) | Fact-Only | `architecture_notes` | None | Included in Sheet 1 of the 2-Sheet Excel Workbook and PDF Report. |

---

## 3. Reverse Convergence Matrix — All 38 Detailed Checklist Questions (`M1.1`–`M16.2`)

| Section | Control Code | Detailed Security Question | Visibility Condition (`showOnlyIf`) | Mandatory & Hard-Required Status | Converging Preliminary Triggers (`P1`–`P30`) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **M1 · App Core** | **M1.1** | What is the business criticality tier and target RTO/RPO of this application or release? | Always visible when `M1` is unlocked | **Mandatory** | `P1=new_app`, `P1=enhancement`, `P2=no/not_sure`, `P3=major`, `P29=yes` |
| **M1 · App Core** | **M1.2** | Have SAST, SCA (dependency vulnerabilities), and container/artifact signing been integrated into the CI/CD pipeline? | Always visible when `M1` is unlocked | **Mandatory** | `P1=new_app`, `P1=enhancement`, `P21=source_code_ip`, `P29=yes` |
| **M1 · App Core** | **M1.3** | Which browser security headers, cookie flags, and anti-CSRF protections are enforced on the web UI? | `P9` includes `web_browser`, OR `P4` includes `ui`, OR `P22` includes `on_device` | **Mandatory** when `P9=web_browser` or `P4=ui` | `P4=ui`, `P9=web_browser`, `P22=on_device` |
| **M2 · IAM & Access** | **M2.1** | How are human users authenticated and integrated with the Bank's Enterprise Identity Provider (SSO / MFA)? | Always visible when `M2` is unlocked | **Mandatory** | `P1=new_app/enhancement/vendor/saas`, `P4=login_access`, `P8=*`, `P10=vpn` |
| **M2 · IAM & Access** | **M2.2** | How are non-human credentials, API keys, service accounts, and database passwords stored and rotated? | Flag `non_human_identity_present` = true, OR `P4=login_access`, OR `P21=secrets_keys` | **Mandatory** when `non_human_identity_present` or `P21=secrets_keys` | `P1=new_app/rpa_process`, `P4=login_access`, `P11!=none`, `P21=secrets_keys` |
| **M2 · IAM & Access** | **M2.3** | How is privileged administrative access governed (Maker-Checker, PAM Jump-Host, Session Recording)? | `P8` includes `privileged_admins`, OR `P9` includes `cli`/`rdp_vdi`, OR `P11` includes `db_accounts` | **Mandatory** when `P8=privileged_admins` | `P8=privileged_admins`, `P9=cli`, `P9=rdp_vdi`, `P11=db_accounts` |
| **M2 · IAM & Access** | **M2.4** | How are external retail/corporate customers authenticated (CIAM, Device Binding, Step-Up MFA, Fraud Velocity)? | `P8` includes `customers` or `corporates_bc` | **HARD-REQUIRED (No N/A)** when `P8` includes `customers` or `corporates_bc` | `P8=customers`, `P8=corporates_bc` |
| **M2 · IAM & Access** | **M2.5** | How are anonymous / unauthenticated public endpoints isolated from authenticated session state and protected against scraping? | `P12` in [`yes`, `not_sure`] | **HARD-REQUIRED (No N/A)** when `P12=yes` | `P12=yes`, `P12=not_sure` |
| **M3 · Architecture** | **M3.1** | How is the application segmented across Web/Ingress, Application, and Database trust zones? | Always visible when `M3` is unlocked | **Mandatory** | `P1=new_app/enhancement/new_integration/infra`, `P4=integrations`, `P13!=no`, `P15=yes`, `P17=yes` |
| **M3 · Architecture** | **M3.2** | Describe the end-to-end data flow across trust boundaries (DMZ, Internal LAN, Cloud VPC, Partner VPN). | Always visible when `M3` is unlocked | **Mandatory** when `new_trust_boundary_crossing` = true | `P1=new_app/new_integration`, `P3=major`, `P4=integrations/data_flows`, `P13!=no`, `P15=yes/not_sure` |
| **M4 · Data Protection** | **M4.1** | How is sensitive/confidential data encrypted at rest across databases, object storage, and volumes? | Always visible when `M4` is unlocked | **HARD-REQUIRED (No N/A)** when `pii_or_pci_in_scope` or `P20=sensitive` | `P1=data_migration`, `P4=database/data_flows/reports`, `P19=yes`, `P20=confidential/sensitive`, `P21=*`, `P22=at_rest_db_files` |
| **M4 · Data Protection** | **M4.2** | How is production data masked, tokenized, or replaced with synthetic test data in UAT and Development environments? | `P6` includes `uat`/`development`, OR `P20=sensitive`, OR `pii_or_pci_in_scope` = true | **Mandatory** when `pii_or_pci_in_scope` AND `P6` includes `uat`/`development` | `P6=uat`, `P6=development`, `P20=sensitive`, `P21=pii` |
| **M4 · Data Protection** | **M4.3** | What cryptographic protocols and cipher suites protect data in transit (TLS 1.2/1.3, mTLS, payload JWE/PGP)? | `P22` includes `in_transit`, OR `P4` includes `data_flows`, OR `P20` in [`confidential`, `sensitive`] | **Mandatory** | `P4=data_flows`, `P20=confidential/sensitive/not_sure`, `P21=financial`, `P22=in_transit` |
| **M4 · Data Protection** | **M4.4** | How are DPDP Act privacy requirements enforced (Consent Notice, Purpose Limitation, Field Masking & Automated Retention Purge)? | `P21` includes `pii`, OR `P26` includes `dpdp_law` | **Mandatory** when `P21=pii` or `P26=dpdp_law` | `P21=pii`, `P26=dpdp_law` *(Multi-Trigger Convergence)* |
| **M4 · Data Protection** | **M4.5** | How are bulk reports and data exports protected against unauthorized exfiltration (DLP, Watermarking, Role Caps)? | `P4` includes `reports` | **Mandatory** when `P4=reports` | `P4=reports` |
| **M4 · Data Protection** | **M4.6** | How is Cardholder Data (PCI-DSS v4.0) segmented in the CDE, tokenized, and processed via Hardware HSMs? | `P21` includes `pci`, OR `P26` includes `pci_dss` | **HARD-REQUIRED (No N/A)** when `P21=pci` or `P26=pci_dss` | `P21=pci`, `P26=pci_dss` *(Multi-Trigger Convergence)* |
| **M4 · Data Protection** | **M4.7** | How is sensitive data cached in memory (Redis / Memcached) secured with TLS, authentication ACLs, and TTL eviction? | `P22` includes `in_cache` | **Mandatory** when `P22=in_cache` | `P22=in_cache` |
| **M4 · Data Protection** | **M4.8** | What anti-exfiltration controls (Database Activity Monitoring [DAM], Pagination Caps, Query Rate Limits) protect large datasets? | `P23` in [`10k_to_1m`, `over_1m`, `not_sure`] | **Mandatory** when `P23` in [`10k_to_1m`, `over_1m`] | `P23=10k_to_1m`, `P23=over_1m`, `P23=not_sure` |
| **M4 · Data Protection** | **M4.9** | What regulatory approval and DPO sign-off govern cross-border data processing/storage outside India (RBI Data Localization)? | `P24` in [`yes`, `not_sure`] | **HARD-REQUIRED (No N/A)** when `P24=yes` | `P24=yes`, `P24=not_sure` |
| **M5 · APIs & Sync** | **M5.1** | How are synchronous APIs authenticated and authorized (mTLS, OAuth2/OIDC, Scoped JWT Claims)? | Always visible when `M5` is unlocked | **Mandatory** | `P1=new_integration`, `P4=apis/integrations`, `P11=api_clients/microservices`, `P13=external/both`, `P14=rest_api/webhooks`, `P16!=no` |
| **M5 · APIs & Sync** | **M5.2** | Are rate limiting, payload size caps, and OpenAPI/JSON schema validation enforced at the API Gateway and service tier? | Always visible when `M5` is unlocked | **Mandatory** | `P1=new_integration`, `P4=apis/integrations`, `P14=rest_api`, `P16!=no` |
| **M5 · APIs & Sync** | **M5.3** | Why is a direct database connection used instead of an API, and how are JDBC TLS and read-only view scopes enforced? | `P14` includes `db_connection` | **Mandatory** when `P14=db_connection` | `P14=db_connection` |
| **M5 · APIs & Sync** | **M5.4** | How are outbound email / SMTP / SMS integrations routed through the Bank's DLP relay with SPF/DKIM/DMARC? | `P14` includes `email_smtp` | **Mandatory** when `P14=email_smtp` | `P14=email_smtp` |
| **M5 · APIs & Sync** | **M5.5** | How is the proprietary / custom socket protocol wrapped in TLS, length-bounded, and fuzz-tested against parser exploits? | `P14` includes `custom_protocol` | **Mandatory** when `P14=custom_protocol` | `P14=custom_protocol` |
| **M5 · APIs & Sync** | **M5.6** | Why are APIs exposed directly without the Enterprise API Gateway, and what compensating WAF/mTLS controls are in place? | `P16` = `yes_direct` | **HARD-REQUIRED (No N/A)** when `P16=yes_direct` | `P16=yes_direct` |
| **M6 · File Transfer** | **M6.1** | How are batch files encrypted in transit (SFTP SSH Keys / FTPS) and at payload level (PGP encryption & detached signatures)? | Always visible when `M6` is unlocked (`P14=file_transfer`) | **Mandatory** | `P14=file_transfer` |
| **M6 · File Transfer** | **M6.2** | Are external partner files terminated in a DMZ staging zone, scanned for malware, and pulled inward by internal MFT nodes? | Flag `external_file_transfer` = true (`P14=file_transfer` + external party) | **HARD-REQUIRED (No N/A)** when `external_file_transfer` = true | `P14=file_transfer` *(when paired with `P13=external/both`, `P18=yes`, or `P10=partner_network`)* |
| **M7 · Queues & Events**| **M7.1** | How are message brokers / Kafka clusters secured (mTLS in transit, per-topic Producer/Consumer ACLs, DLQ poison handling)? | `P14` includes `queues_streams` | **Mandatory** when `P14=queues_streams` | `P14=queues_streams` |
| **M7 · Queues & Events**| **M7.2** | How are inbound/outbound webhooks verified (HMAC-SHA256 payload signatures, timestamp replay windows, egress proxy)? | `P14` includes `webhooks` | **Mandatory** when `P14=webhooks` | `P14=webhooks` |
| **M8 · Vendor & SaaS** | **M8.1** | Has the vendor completed Third-Party Risk Management (TPRM) assessment with valid SOC2 Type II / ISO 27001 certification? | Always visible when `M8` is unlocked | **Mandatory** | `P1=vendor_onboarding/saas_portal`, `P5=vendor_saas`, `P7!=in_house`, `P18=yes/not_sure`, `P28=yes_third_party` |
| **M8 · Vendor & SaaS** | **M8.2** | How is vendor-delivered software verified for supply-chain integrity (Bank Git build, SAST/SCA scan, zero backdoors)? | `P7` in [`vendor_builds_bank_runs`, `vendor_builds_and_runs`], OR `P21` includes `source_code_ip` | **Mandatory** | `P1=vendor_onboarding`, `P7=vendor_builds_bank_runs`, `P7=vendor_builds_and_runs`, `P21=source_code_ip` |
| **M8 · Vendor & SaaS** | **M8.3** | How is vendor/partner remote support access governed (CyberArk PAM jump-host, MFA, session recording)? | `P7` = `vendor_builds_and_runs`, OR `P8` includes `partner_vendor_staff`, OR `P9` includes `rdp_vdi`, OR `P18=yes` | **Mandatory** | `P7=vendor_builds_and_runs`, `P8=partner_vendor_staff`, `P9=rdp_vdi`, `P18=yes` |
| **M8 · Vendor & SaaS** | **M8.4** | How is the external SaaS portal hardened (Dedicated tenant isolation, Bank SAML/OIDC SSO, corporate IP egress allowlisting)? | `P1` includes `saas_portal`, OR `P5=vendor_saas`, OR `P7=vendor_saas_sub` | **Mandatory** | `P1=saas_portal`, `P5=vendor_saas`, `P7=vendor_saas_sub` |
| **M9 · RPA & Bots** | **M9.1** | Does the RPA bot run in attended or unattended mode, and how are its target application credentials fetched from Vault? | Always visible when `M9` is unlocked (`P1=rpa_process` or `P11=rpa_bots`) | **Mandatory** | `P1=rpa_process`, `P11=rpa_bots` |
| **M9 · RPA & Bots** | **M9.2** | How is the RPA bot runner VDI hardened, isolated, and automatically wiped of local temp files after each job? | Always visible when `M9` is unlocked | **Mandatory** | `P1=rpa_process`, `P11=rpa_bots` |
| **M10 · On-Prem Infra** | **M10.1** | Are all servers/VMs provisioned from the Bank's CIS-hardened Golden Image with EDR, FIM, and patch agents installed? | Always visible when `M10` is unlocked | **Mandatory** | `P1=infra_cloud_network`, `P4=servers_hosting`, `P5=hybrid/not_decided`, `P27=yes/not_sure` |
| **M10 · On-Prem Infra** | **M10.2** | How are containers and database engines hardened (Signed images, non-root runtime, K8s NetworkPolicies, CIS DB benchmark)? | `P27=yes`, OR `P11` includes `microservices` | **Mandatory** | `P11=microservices`, `P27=yes` |
| **M11 · Cloud Posture** | **M11.1** | Is the workload deployed inside the Bank's governed Cloud Landing Zone with private subnets, SCPs, and CSPM/GuardDuty? | Always visible when `M11` is unlocked | **Mandatory** | `P1=infra_cloud_network`, `P4=servers_hosting`, `P5=bank_aws/other_cloud/hybrid/not_decided`, `P24=yes` |
| **M11 · Cloud Posture** | **M11.2** | Are cloud storage buckets and managed databases configured with Block Public Access, KMS CMK encryption, and IAM workload roles? | `P5` in [`other_cloud`, `hybrid`], OR `P27=yes` (in Cloud), OR `P22=at_rest_db_files` (in Cloud) | **Mandatory** | `P5=other_cloud`, `P5=hybrid`, `P27=yes` *(when cloud hosted)* |
| **M12 · Network & FW** | **M12.1** | What is the perimeter network topology, and are all firewall rules strictly scoped to specific IP/CIDRs and ports (zero `0.0.0.0/0`)? | Always visible when `M12` is unlocked | **Mandatory** | `P1=saas_portal/infra_cloud_network`, `P4=servers_hosting`, `P5=vendor_saas/hybrid`, `P10=internet/partner`, `P13=external/both`, `P15=yes`, `P17=yes` |
| **M12 · Network & FW** | **M12.2** | Which external WAF, DDoS scrubbing, TLS 1.3 termination, and bot mitigation controls protect internet-facing endpoints? | Flag `internet_facing` = true, OR `P12=yes` | **HARD-REQUIRED (No N/A)** when `internet_facing` = true | `P8=customers/corporates_bc`, `P10=internet`, `P12=yes` |
| **M12 · Network & FW** | **M12.3** | How is partner/vendor network connectivity terminated in the Partner DMZ (IPsec/MPLS, NAT, mutual IP allowlisting)? | `P10` includes `partner_network`, OR `P8` includes `partner_vendor_staff`, OR `P13` in [`external_only`, `both`], OR `P18=yes` | **Mandatory** | `P7=vendor_builds_and_runs`, `P8=partner_vendor_staff`, `P10=partner_network`, `P13=external_only/both`, `P18=yes/not_sure` |
| **M13 · Migration** | **M13.1** | How is migrated data encrypted in flight and reconciled via cryptographic checksums (SHA-256) and row counts? | Always visible when `M13` is unlocked (`P1=data_migration` or `P25=yes`) | **Mandatory** | `P1=data_migration`, `P25=yes` |
| **M13 · Migration** | **M13.2** | How are temporary migration staging buckets/tables access-restricted and cryptographically wiped after cutover? | Always visible when `M13` is unlocked | **Mandatory** | `P1=data_migration`, `P25=yes` |
| **M14 · Mobile/Client** | **M14.1** | Which mobile application security controls are enforced (TLS Cert Pinning, Root/Jailbreak RASP, Obfuscation, Keychain/Keystore)? | `P9` includes `mobile_app`, OR `P22` includes `on_device` | **HARD-REQUIRED (No N/A)** when `P9=mobile_app` | `P9=mobile_app`, `P22=on_device` |
| **M14 · Mobile/Client** | **M14.2** | How are desktop thick-clients or branch kiosks hardened (Code signing, OS kiosk lockdown, zero local cleartext secrets)? | `P9` includes `desktop_app` or `kiosk` | **Mandatory** | `P9=desktop_app`, `P9=kiosk` |
| **M15 · AI & LLM** | **M15.1** | What prompt-injection guardrails, PII redaction filters, and human-in-the-loop approvals govern the AI/LLM workflow? | Always visible when `M15` is unlocked (`P28 != no`) | **HARD-REQUIRED (No N/A)** when `ai_or_llm_present` = true | `P28=yes_bank_hosted`, `P28=yes_third_party`, `P28=not_sure` |
| **M15 · AI & LLM** | **M15.2** | How are RAG vector databases and LLM tool/function-calling permissions restricted to the authenticated user's RBAC scope? | Always visible when `M15` is unlocked (`P28 != no`) | **Mandatory** | `P28=yes_bank_hosted`, `P28=yes_third_party`, `P28=not_sure` |
| **M15 · AI & LLM** | **M15.3** | Has an Enterprise Zero-Data-Retention & Zero-Model-Training agreement been executed with the external AI provider? | Flag `external_ai_present` = true (`P28` in [`yes_third_party`, `not_sure`]) | **HARD-REQUIRED (No N/A)** when `external_ai_present` = true | `P28=yes_third_party`, `P28=not_sure` |
| **M16 · SIEM & DR** | **M16.1** | Are security/application audit logs forwarded in real time to the Bank's Central SOC SIEM with sensitive token scrubbing? | Always visible when `M16` is unlocked | **Mandatory** | `P1=new_app/enhancement/infra`, `P6=production/dr`, `P20=sensitive`, `P21=financial/logs`, `P22=in_logs`, `P23=over_1m`, `P26=rbi_guidelines` |
| **M16 · SIEM & DR** | **M16.2** | What is the Disaster Recovery (DR) architecture, backup immutability (Object-Lock), and automated failover drill cadence? | `P6` includes `dr`, OR `P22` includes `in_backups`, OR `P23=over_1m`, OR `P4=database`, OR `P1=new_app` | **Mandatory** when `P6=dr` or `P22=in_backups` | `P1=new_app`, `P4=database`, `P6=dr`, `P22=in_backups`, `P23=over_1m` |

---

## 4. Minor Enhancement Scope Narrowing (`P4`) & 7 High-Risk Override Triggers

When a requester selects:
1. **`P1 = ['enhancement']`** (only Enhancement selected), AND
2. **`P2 = 'yes'`** (application has a prior approved SAR), AND
3. **`P3 = 'minor'`** (Minor change), AND
4. **Zero Override Triggers (`OVR-01`–`OVR-07`) fire**,

then `evaluateSAR()` sets `scope_narrowed = true` and narrows the Detailed Security Checklist strictly to the components selected in **`P4`**:

| `P4` Selected Component | Retained Checklist Sections | Retained Detailed Controls | Suppressed Domains |
| :--- | :--- | :--- | :--- |
| **User interface (UI)** (`ui`) | `M0`, `M1`, `M17` | `M1.1`, `M1.2`, `M1.3` | Suppresses `M2`–`M16` |
| **APIs** (`apis`) | `M0`, `M1`, `M5`, `M17` | `M1.1`, `M1.2`, `M5.1`, `M5.2` + API Table | Suppresses unrelated infra/vendor/data modules |
| **Database or storage** (`database`) | `M0`, `M1`, `M4`, `M16`, `M17` | `M1.1`, `M1.2`, `M4.1`, `M16.1`, `M16.2` | Suppresses unrelated UI/vendor/mobile modules |
| **Login, roles or access** (`login_access`) | `M0`, `M1`, `M2`, `M17` | `M1.1`, `M1.2`, `M2.1`, `M2.2` | Suppresses unrelated infra/migration modules |
| **Integrations** (`integrations`) | `M0`, `M1`, `M3`, `M5`, `M6`, `M7`, `M17` | `M3.1`, `M3.2`, `M5.1`, `M5.2`, `M6.1`*, `M7.1`* | Retains active integration protocols |
| **Servers, cloud or network** (`servers_hosting`) | `M0`, `M1`, `M10`*, `M11`*, `M12`, `M17` | `M10.1`, `M11.1`, `M12.1` + Server/FW Tables | Retains hosting & network perimeter modules |
| **Data flows** (`data_flows`) | `M0`, `M1`, `M3`, `M4`, `M13`*, `M17` | `M3.1`, `M3.2`, `M4.1`, `M4.3`, `M13.1`* | Retains boundary & in-transit encryption controls |
| **Reports or exports** (`reports`) | `M0`, `M1`, `M4`, `M17` | `M1.1`, `M1.2`, `M4.1`, `M4.5` | Retains Bulk Export DLP & Watermarking (`M4.5`) |

### The 7 High-Risk Override Triggers (Defeat Minor Enhancement Narrowing)
If **any** of the following 7 conditions are present, Scope Narrowing is automatically overridden (`scope_narrowed = false`) and the corresponding security domains are unlocked:
1. **`OVR-01` (`P17 = yes | not_sure`)**: New firewall rules or network ports required ➔ Unlocks `M3`, `M12` (`M12.1` + Firewall Table).
2. **`OVR-02` (`P18 = yes | not_sure`)**: New vendor or third-party connection introduced ➔ Unlocks `M3`, `M8`, `M12` (`M8.1`, `M8.3`, `M12.3`).
3. **`OVR-03` (`P21` includes `pii`, `pci`, or `secrets_keys`)**: Regulated personal/cardholder data or cryptographic keys in scope ➔ Unlocks `M4` (`M4.1`, `M4.4`/`M4.6`) & `M2.2`.
4. **`OVR-04` (`P28 != no`)**: AI or LLM component included ➔ Unlocks `M15` (`M15.1`, `M15.2`, and `M15.3` if external).
5. **`OVR-05` (`P10` includes `internet` or `partner_network`)**: Reachable from public internet or partner network ➔ Unlocks `M12` (`M12.1`, `M12.2`/`M12.3`).
6. **`OVR-06` (`P8` includes `customers` or `partner_vendor_staff`)**: Accessed by external customers or vendor staff ➔ Unlocks `M2` (`M2.4`) or `M8` (`M8.3`).
7. **`OVR-07` (`P15 = yes | not_sure`)**: Connection crosses a trust boundary ➔ Unlocks `M3` (`M3.1`, `M3.2`) & `M12` (`M12.1`).

---

## 5. Automated Cross-Answer Contradiction Detection Rules (`CHK-01`–`CHK-07`)

| Code | Severity | Contradictory Permutation Combination | Alert Message | Remediation / Override Requirement |
| :--- | :--- | :--- | :--- | :--- |
| **CHK-01** | **High** | `P19 = No` AND `P21` includes `pii`, `pci`, `financial`, or `secrets_keys` | P19 states no bank/customer data is touched, but regulated data types are selected in P21. | Set `P19 = Yes` so `M4` Data Protection controls are evaluated. |
| **CHK-02** | **High** | `P8` includes `customers` AND `P10` does NOT include `internet` | Retail customers are selected in P8, but Public Internet is not selected in P10. | Add `internet` in `P10` or remove `customers` from `P8`. |
| **CHK-03** | **Warning** | `P5 = vendor_saas` AND `P7 = in_house` | Hosting is marked as Vendor SaaS (P5), but ownership is marked as 100% Built & Run In-House (P7). | Update `P7` to Vendor SaaS or Vendor-managed. |
| **CHK-04** | **High** | `P12 = yes` (Anonymous access) AND `P20 = sensitive` | Anonymous/unauthenticated access is enabled while Sensitive data is in scope. | Disable anonymous access (`P12 = no`) or document strict public endpoint isolation in `M2.5`. |
| **CHK-05** | **Warning** | `P13 = no` (Standalone) AND (`P1` includes `new_integration` OR `P18 = yes`) | P13 states no integrations, but New Integration (P1) or New Vendor Connection (P18) is selected. | Update `P13` to Internal, External, or Both so `P14`–`P16` are captured. |
| **CHK-06** | **High** | `P21` includes `pci` AND `P24 = yes` (Outside India) | Cardholder (PCI) data is marked as processed outside India — conflicts with RBI Payment Data Localization. | Restrict PCI storage to India (`P24 = no`) or document RBI exception in `M4.9`. |
| **CHK-07** | **Warning** | `P1` includes `rpa_process` AND `P11 = none` | RPA bot process is selected in P1, but P11 states there are no non-human identities. | Select `rpa_bots` or `service_accounts` in `P11` so `M2.2` and `M9` are evaluated. |
