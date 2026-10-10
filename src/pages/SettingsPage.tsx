import React, { useState } from 'react';
import { useInvestigation } from '../context/InvestigationContext';

export const SettingsPage: React.FC = () => {
  const { settings, updateSettings } = useInvestigation();

  const [activeSection, setActiveSection] = useState('general');
  const [orgName, setOrgName] = useState(settings.orgName);
  const [currency, setCurrency] = useState(settings.currency);
  const [timezone, setTimezone] = useState(settings.timezone);
  const [dateFormat, setDateFormat] = useState(settings.dateFormat);

  const [policies, setPolicies] = useState(settings.policies);
  const [riskRules, setRiskRules] = useState(settings.riskRules);
  const [notifications, setNotifications] = useState(settings.notifications);
  const [aiPreferences, setAiPreferences] = useState(settings.aiPreferences);

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      updateSettings({
        orgName,
        currency,
        timezone,
        dateFormat,
        policies,
        riskRules,
        notifications,
        aiPreferences,
      });
      setIsSaving(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }, 700);
  };

  const navItems = [
    { id: 'general', label: 'General', icon: 'tune' },
    { id: 'refund-policies', label: 'Refund Policies', icon: 'balance', tag: '5 Rules' },
    { id: 'risk-rules', label: 'Risk & Human Review', icon: 'verified_user', dot: true },
    { id: 'notifications', label: 'Notifications', icon: 'notifications_active' },
    { id: 'ai-preferences', label: 'AI Preferences', icon: 'smart_toy' },
  ];

  return (
    <div className="flex flex-col w-full pb-20 text-left">
      {/* Save Success Alert */}
      {saveSuccess && (
        <div className="fixed top-20 right-6 z-50 p-4 rounded-2xl bg-primary-container text-on-primary-container font-semibold shadow-2xl flex items-center gap-3 animate-fade-in border border-primary">
          <span className="material-symbols-outlined text-[22px]">task_alt</span>
          <span>Platform settings updated and logged to audit ledger!</span>
        </div>
      )}

      {/* Header & Breadcrumbs Area */}
      <div className="relative flex flex-col gap-1 pb-space-lg mb-2">
        <div className="flex items-center gap-2 font-label-sm text-[11px] text-outline tracking-wider uppercase">
          <span>System</span>
          <span className="material-symbols-outlined text-[14px]">chevron_right</span>
          <span className="text-on-surface font-semibold">Platform Settings</span>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mt-1">
          <div>
            <h1 className="font-headline-lg text-2xl sm:text-headline-lg text-on-surface tracking-tight font-bold">
              Settings
            </h1>
            <p className="font-body-md text-xs sm:text-sm text-on-surface-variant mt-1 max-w-3xl">
              Configure refund investigation policies, risk thresholds, human review rules, and platform preferences.
            </p>
          </div>
          <div className="flex items-center gap-2 bg-surface-container-low px-3 py-1.5 rounded-full shrink-0 border border-surface-container">
            <span className="w-2 h-2 rounded-full bg-primary-container animate-pulse"></span>
            <span className="font-label-sm text-xs text-on-surface-variant">Refund Policies: Active</span>
          </div>
        </div>
      </div>

      {/* Main Asymmetric Settings Cockpit */}
      <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-space-xl items-start">
        {/* Sub-navigation Rail (Sticky Column) */}
        <nav className="lg:col-span-3 sticky top-20 flex flex-col gap-1 bg-surface-container-lowest p-space-md rounded-2xl shadow-sm border border-surface-container">
          <p className="font-label-sm text-[11px] uppercase tracking-wider text-outline px-space-sm pb-space-xs font-semibold">
            Preferences
          </p>
          {navItems.map((item) => {
            const isActive = activeSection === item.id;
            return (
              <a
                key={item.id}
                href={`#${item.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  setActiveSection(item.id);
                  document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth' });
                }}
                className={`flex items-center justify-between px-space-md py-2.5 rounded-xl font-label-md text-xs sm:text-sm transition-all ${
                  isActive
                    ? 'bg-primary-container text-on-primary-container font-semibold shadow-xs'
                    : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
                  <span>{item.label}</span>
                </div>
                {item.tag && <span className="font-code-sm text-[11px] text-outline">{item.tag}</span>}
                {item.dot && <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>}
                {isActive && !item.tag && !item.dot && (
                  <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                )}
              </a>
            );
          })}
        </nav>

        {/* Detailed Content Columns */}
        <div className="lg:col-span-9 flex flex-col gap-space-xl">
          {/* SECTION 1: General Settings */}
          <section
            id="general"
            className="p-space-lg sm:p-space-xl rounded-2xl bg-surface-container-lowest shadow-sm border border-surface-container flex flex-col gap-space-lg"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-space-sm border-b border-surface-container">
              <div>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[22px]">tune</span>
                  <h2 className="font-headline-md text-lg sm:text-headline-md font-bold text-on-surface tracking-tight">
                    General Settings
                  </h2>
                </div>
                <p className="font-body-sm text-xs text-on-surface-variant mt-1">
                  Manage platform localization, reporting formats, and regional operating parameters.
                </p>
              </div>
              <button
                onClick={handleSave}
                className="self-start sm:self-auto px-space-md py-2 rounded-full bg-primary-container text-on-primary-container font-label-md text-xs font-semibold hover:shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                type="button"
              >
                <span className="material-symbols-outlined text-[16px]">save</span>
                <span>Save Changes</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
              {/* Field: Org Name */}
              <div className="flex flex-col gap-1.5">
                <label className="font-label-md text-xs font-medium text-on-surface flex items-center justify-between" htmlFor="org-name">
                  <span>Organization Name</span>
                  <span className="font-label-sm text-[11px] text-outline">Verified Tenant</span>
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">
                    apartment
                  </span>
                  <input
                    id="org-name"
                    type="text"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    className="w-full h-11 pl-10 pr-4 rounded-xl bg-surface-container-low font-body-md text-xs sm:text-sm text-on-surface focus:bg-surface-container-lowest focus:shadow-xs focus:outline-none border border-surface-container transition-all"
                  />
                </div>
              </div>

              {/* Field: Default Currency */}
              <div className="flex flex-col gap-1.5">
                <label className="font-label-md text-xs font-medium text-on-surface" htmlFor="currency-select">
                  Default Currency
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">
                    currency_rupee
                  </span>
                  <select
                    id="currency-select"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full h-11 pl-10 pr-9 rounded-xl bg-surface-container-low font-body-md text-xs sm:text-sm text-on-surface focus:bg-surface-container-lowest focus:shadow-xs focus:outline-none appearance-none border border-surface-container transition-all cursor-pointer"
                  >
                    <option>INR (₹) - Indian Rupee</option>
                    <option>USD ($) - US Dollar</option>
                    <option>EUR (€) - Euro</option>
                    <option>GBP (£) - British Pound</option>
                    <option>SGD (S$) - Singapore Dollar</option>
                  </select>
                  <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-outline text-[18px] pointer-events-none">
                    expand_more
                  </span>
                </div>
              </div>

              {/* Field: Investigation Timezone */}
              <div className="flex flex-col gap-1.5">
                <label className="font-label-md text-xs font-medium text-on-surface" htmlFor="timezone-select">
                  Investigation Timezone
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">
                    schedule
                  </span>
                  <select
                    id="timezone-select"
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="w-full h-11 pl-10 pr-9 rounded-xl bg-surface-container-low font-body-md text-xs sm:text-sm text-on-surface focus:bg-surface-container-lowest focus:shadow-xs focus:outline-none appearance-none border border-surface-container transition-all cursor-pointer"
                  >
                    <option>Asia/Kolkata (IST, UTC+05:30)</option>
                    <option>UTC (Coordinated Universal Time)</option>
                    <option>Europe/London (BST, UTC+01:00)</option>
                    <option>America/New_York (EST, UTC-05:00)</option>
                    <option>Asia/Singapore (SGT, UTC+08:00)</option>
                  </select>
                  <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-outline text-[18px] pointer-events-none">
                    expand_more
                  </span>
                </div>
              </div>

              {/* Field: Date Format */}
              <div className="flex flex-col gap-1.5">
                <label className="font-label-md text-xs font-medium text-on-surface" htmlFor="date-format-select">
                  Date Format
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">
                    calendar_today
                  </span>
                  <select
                    id="date-format-select"
                    value={dateFormat}
                    onChange={(e) => setDateFormat(e.target.value)}
                    className="w-full h-11 pl-10 pr-9 rounded-xl bg-surface-container-low font-body-md text-xs sm:text-sm text-on-surface focus:bg-surface-container-lowest focus:shadow-xs focus:outline-none appearance-none border border-surface-container transition-all cursor-pointer"
                  >
                    <option>DD MMM YYYY (e.g., 24 Oct 2026)</option>
                    <option>YYYY-MM-DD (ISO 8601)</option>
                    <option>MM/DD/YYYY</option>
                    <option>DD/MM/YYYY</option>
                  </select>
                  <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-outline text-[18px] pointer-events-none">
                    expand_more
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* SECTION 2: Refund Investigation Policies */}
          <section
            id="refund-policies"
            className="p-space-lg sm:p-space-xl rounded-2xl bg-surface-container-lowest shadow-sm border border-surface-container flex flex-col gap-space-lg"
          >
            <div className="flex flex-col gap-1 pb-space-sm border-b border-surface-container">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[22px]">balance</span>
                <h2 className="font-headline-md text-lg sm:text-headline-md font-bold text-on-surface tracking-tight">
                  Refund Policies
                </h2>
              </div>
              <p className="font-body-sm text-xs text-on-surface-variant">
                Configure refund investigation policies and evidence checks.
              </p>
            </div>

            {/* Policy Items Stack */}
            <div className="flex flex-col gap-space-sm">
              {/* Item 1 */}
              <div className="p-space-md rounded-xl bg-surface-container-low border border-surface-container flex items-start justify-between gap-4 transition-colors hover:bg-surface-container">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-surface-container-lowest flex items-center justify-center text-primary shrink-0 shadow-xs">
                    <span className="material-symbols-outlined text-[20px]">currency_exchange</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-label-md text-xs sm:text-sm font-semibold text-on-surface">
                      Full Refund Recommendation
                    </span>
                    <p className="font-body-sm text-xs text-on-surface-variant mt-0.5">
                      Allows AI to recommend a full refund when the applicable policy supports it.
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                  <input
                    type="checkbox"
                    checked={policies.fullRefund}
                    onChange={(e) => setPolicies({ ...policies, fullRefund: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-surface-container-highest peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-surface-container-lowest after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-surface-container-lowest after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-container"></div>
                </label>
              </div>

              {/* Item 2 */}
              <div className="p-space-md rounded-xl bg-surface-container-low border border-surface-container flex items-start justify-between gap-4 transition-colors hover:bg-surface-container">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-surface-container-lowest flex items-center justify-center text-secondary shrink-0 shadow-xs">
                    <span className="material-symbols-outlined text-[20px]">pie_chart</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-label-md text-xs sm:text-sm font-semibold text-on-surface">
                      Partial Refund Recommendation
                    </span>
                    <p className="font-body-sm text-xs text-on-surface-variant mt-0.5">
                      Evaluates sector disruptions, non-refundable taxes, and pro-rated fare segments.
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                  <input
                    type="checkbox"
                    checked={policies.partialRefund}
                    onChange={(e) => setPolicies({ ...policies, partialRefund: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-surface-container-highest peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-surface-container-lowest after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-surface-container-lowest after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-container"></div>
                </label>
              </div>

              {/* Item 3 */}
              <div className="p-space-md rounded-xl bg-surface-container-low border border-surface-container flex items-start justify-between gap-4 transition-colors hover:bg-surface-container">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-surface-container-lowest flex items-center justify-center text-on-surface shrink-0 shadow-xs">
                    <span className="material-symbols-outlined text-[20px]">rule_folder</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-label-md text-xs sm:text-sm font-semibold text-on-surface">
                      Policy Evidence Required
                    </span>
                    <p className="font-body-sm text-xs text-on-surface-variant mt-0.5">
                      Checks the applicable refund policy before making a recommendation.
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                  <input
                    type="checkbox"
                    checked={policies.policyEvidenceRequired}
                    onChange={(e) => setPolicies({ ...policies, policyEvidenceRequired: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-surface-container-highest peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-surface-container-lowest after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-surface-container-lowest after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-container"></div>
                </label>
              </div>

              {/* Item 4 */}
              <div className="p-space-md rounded-xl bg-surface-container-low border border-surface-container flex items-start justify-between gap-4 transition-colors hover:bg-surface-container">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-surface-container-lowest flex items-center justify-center text-outline shrink-0 shadow-xs">
                    <span className="material-symbols-outlined text-[20px]">manage_history</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-label-md text-xs sm:text-sm font-semibold text-on-surface">
                      Customer History Check
                    </span>
                    <p className="font-body-sm text-xs text-on-surface-variant mt-0.5">
                      Checks customer history for relevant refund and dispute patterns.
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                  <input
                    type="checkbox"
                    checked={policies.customerHistoryCheck}
                    onChange={(e) => setPolicies({ ...policies, customerHistoryCheck: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-surface-container-highest peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-surface-container-lowest after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-surface-container-lowest after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-container"></div>
                </label>
              </div>

              {/* Item 5 */}
              <div className="p-space-md rounded-xl bg-surface-container-low border border-surface-container flex items-start justify-between gap-4 transition-colors hover:bg-surface-container">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-surface-container-lowest flex items-center justify-center text-primary-container shrink-0 shadow-xs">
                    <span className="material-symbols-outlined text-[20px]">flight_takeoff</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-label-md text-xs sm:text-sm font-semibold text-on-surface">
                      Cancellation Evidence Check
                    </span>
                    <p className="font-body-sm text-xs text-on-surface-variant mt-0.5">
                      Checks booking and cancellation evidence.
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                  <input
                    type="checkbox"
                    checked={policies.cancellationEvidenceCheck}
                    onChange={(e) => setPolicies({ ...policies, cancellationEvidenceCheck: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-surface-container-highest peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-surface-container-lowest after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-surface-container-lowest after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-container"></div>
                </label>
              </div>
            </div>

            {/* Banner */}
            <div className="p-space-md rounded-xl bg-surface-container-low border border-surface-container flex items-center gap-space-md">
              <div className="w-8 h-8 rounded-full bg-secondary-fixed flex items-center justify-center text-secondary shrink-0">
                <span className="material-symbols-outlined text-[18px]">info</span>
              </div>
              <p className="font-body-sm text-xs text-on-surface">
                AI uses these policies as investigation inputs. Final refund decisions remain subject to human approval when required.
              </p>
            </div>
          </section>

          {/* SECTION 3: Risk & Human Review Rules */}
          <section
            id="risk-rules"
            className="p-space-lg sm:p-space-xl rounded-2xl bg-surface-container-lowest shadow-sm border border-surface-container flex flex-col gap-space-lg"
          >
            <div className="flex flex-col gap-1 pb-space-sm border-b border-surface-container">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary text-[22px]">security</span>
                <h2 className="font-headline-md text-lg sm:text-headline-md font-bold text-on-surface tracking-tight">
                  Risk & Human Review Rules
                </h2>
              </div>
              <p className="font-body-sm text-xs text-on-surface-variant">
                Automated thresholds and guardrails triggering required human auditor intervention.
              </p>
            </div>

            <div className="flex flex-col gap-space-md">
              {/* Threshold Slider Card */}
              <div className="p-space-md rounded-xl bg-surface-container-low border border-surface-container flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-label-md text-xs sm:text-sm font-semibold text-on-surface">
                      High Risk Threshold
                    </span>
                    <p className="font-body-sm text-xs text-on-surface-variant">
                      Scale 0–100 anomaly benchmark score. Investigations exceeding this trigger immediate triage locks.
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-surface-container-lowest shadow-xs border border-surface-container">
                    <span className="font-headline-sm text-base font-bold text-secondary">
                      {riskRules.highRiskThreshold}
                    </span>
                    <span className="font-label-sm text-[11px] text-outline">/ 100</span>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <span className="font-code-sm text-xs text-outline">0</span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={riskRules.highRiskThreshold}
                    onChange={(e) =>
                      setRiskRules({ ...riskRules, highRiskThreshold: parseInt(e.target.value, 10) })
                    }
                    className="w-full h-2 bg-surface-container-high rounded-lg appearance-none cursor-pointer accent-secondary"
                  />
                  <span className="font-code-sm text-xs text-outline">100</span>
                </div>
              </div>

              {/* Human Review Required Toggle */}
              <div className="p-space-md rounded-xl bg-surface-container-low border border-surface-container flex items-center justify-between gap-4">
                <div className="flex flex-col">
                  <span className="font-label-md text-xs sm:text-sm font-semibold text-on-surface">
                    Human Review Required
                  </span>
                  <p className="font-body-sm text-xs text-on-surface-variant mt-0.5">
                    Directs cases exceeding risk thresholds into auditor triage queue.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={riskRules.humanReviewRequired}
                    onChange={(e) => setRiskRules({ ...riskRules, humanReviewRequired: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-surface-container-highest peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-surface-container-lowest after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-surface-container-lowest after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-container"></div>
                </label>
              </div>

              {/* High-Value Refund Review */}
              <div className="p-space-md rounded-xl bg-surface-container-low border border-surface-container flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex flex-col max-w-lg">
                  <span className="font-label-md text-xs sm:text-sm font-semibold text-on-surface">
                    High-Value Refund Review
                  </span>
                  <p className="font-body-sm text-xs text-on-surface-variant mt-0.5">
                    Any refund recommendation at or exceeding this threshold requires manual sign-off.
                  </p>
                </div>
                <div className="relative w-full sm:w-44 shrink-0">
                  <span className="font-body-md text-xs sm:text-sm text-outline absolute left-3 top-1/2 -translate-y-1/2 font-semibold">
                    ₹
                  </span>
                  <input
                    type="text"
                    value={riskRules.highValueThreshold.toLocaleString('en-IN')}
                    onChange={(e) => {
                      const num = parseInt(e.target.value.replace(/,/g, ''), 10) || 0;
                      setRiskRules({ ...riskRules, highValueThreshold: num });
                    }}
                    className="w-full h-10 pl-7 pr-3 rounded-xl bg-surface-container-lowest font-headline-sm text-xs sm:text-sm font-semibold text-on-surface focus:outline-none shadow-xs border border-surface-container text-right"
                  />
                </div>
              </div>

              {/* Insufficient Evidence Review */}
              <div className="p-space-md rounded-xl bg-surface-container-low border border-surface-container flex items-center justify-between gap-4">
                <div className="flex flex-col">
                  <span className="font-label-md text-xs sm:text-sm font-semibold text-on-surface">
                    Insufficient Evidence Review
                  </span>
                  <p className="font-body-sm text-xs text-on-surface-variant mt-0.5">
                    Automatically escalates investigations missing carrier or payment verification data.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={riskRules.insufficientEvidenceReview}
                    onChange={(e) => setRiskRules({ ...riskRules, insufficientEvidenceReview: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-surface-container-highest peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-surface-container-lowest after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-surface-container-lowest after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-container"></div>
                </label>
              </div>

              {/* Account or Payment Risk Review */}
              <div className="p-space-md rounded-xl bg-surface-container-low border border-surface-container flex items-center justify-between gap-4">
                <div className="flex flex-col">
                  <span className="font-label-md text-xs sm:text-sm font-semibold text-on-surface">
                    Account or Payment Risk Review
                  </span>
                  <p className="font-body-sm text-xs text-on-surface-variant mt-0.5">
                    Flags mismatched settlement accounts or third-party corporate cards.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={riskRules.paymentRiskReview}
                    onChange={(e) => setRiskRules({ ...riskRules, paymentRiskReview: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-surface-container-highest peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-surface-container-lowest after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-surface-container-lowest after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-container"></div>
                </label>
              </div>
            </div>

            <div className="p-space-md rounded-xl bg-surface-container-low border border-surface-container flex items-center gap-3">
              <span className="material-symbols-outlined text-outline text-[18px]">verified</span>
              <span className="font-body-sm text-xs text-on-surface font-medium">
                Risk signals guide investigation and review. High risk does not automatically mean fraud.
              </span>
            </div>
          </section>

          {/* SECTION 4: Notifications */}
          <section
            id="notifications"
            className="p-space-lg sm:p-space-xl rounded-2xl bg-surface-container-lowest shadow-sm border border-surface-container flex flex-col gap-space-lg"
          >
            <div className="flex flex-col gap-1 pb-space-sm border-b border-surface-container">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[22px]">notifications</span>
                <h2 className="font-headline-md text-lg sm:text-headline-md font-bold text-on-surface tracking-tight">
                  Notifications
                </h2>
              </div>
              <p className="font-body-sm text-xs text-on-surface-variant">
                Configure auditor alerts and escalation dispatch channels.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
              <div className="p-space-md rounded-xl bg-surface-container-low border border-surface-container flex flex-col justify-between gap-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-secondary text-[20px]">assignment_late</span>
                    <span className="font-label-md text-xs sm:text-sm font-semibold text-on-surface">New Human Review</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={notifications.newHumanReview}
                      onChange={(e) => setNotifications({ ...notifications, newHumanReview: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-10 h-5 bg-surface-container-highest rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-surface-container-lowest after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-surface-container-lowest after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary-container"></div>
                  </label>
                </div>
                <p className="font-body-sm text-xs text-on-surface-variant">
                  Immediate dispatch to lead auditors whenever manual triage is locked.
                </p>
              </div>

              <div className="p-space-md rounded-xl bg-surface-container-low border border-surface-container flex flex-col justify-between gap-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-error text-[20px]">warning</span>
                    <span className="font-label-md text-xs sm:text-sm font-semibold text-on-surface">High-Risk Detected</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={notifications.highRiskDetected}
                      onChange={(e) => setNotifications({ ...notifications, highRiskDetected: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-10 h-5 bg-surface-container-highest rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-surface-container-lowest after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-surface-container-lowest after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary-container"></div>
                  </label>
                </div>
                <p className="font-body-sm text-xs text-on-surface-variant">
                  Priority alert triggered for travel claims scoring ≥ 70 on risk index.
                </p>
              </div>

              <div className="p-space-md rounded-xl bg-surface-container-low border border-surface-container flex flex-col justify-between gap-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-[20px]">fact_check</span>
                    <span className="font-label-md text-xs sm:text-sm font-semibold text-on-surface">Investigation Completed</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={notifications.investigationCompleted}
                      onChange={(e) => setNotifications({ ...notifications, investigationCompleted: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-10 h-5 bg-surface-container-highest rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-surface-container-lowest after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-surface-container-lowest after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary-container"></div>
                  </label>
                </div>
                <p className="font-body-sm text-xs text-on-surface-variant">
                  Daily summary digest aggregating automatically resolved refund records.
                </p>
              </div>

              <div className="p-space-md rounded-xl bg-surface-container-low border border-surface-container flex flex-col justify-between gap-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-outline text-[20px]">sync_alt</span>
                    <span className="font-label-md text-xs sm:text-sm font-semibold text-on-surface">Refund Decision Updated</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={notifications.refundDecisionUpdated}
                      onChange={(e) => setNotifications({ ...notifications, refundDecisionUpdated: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-10 h-5 bg-surface-container-highest rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-surface-container-lowest after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-surface-container-lowest after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary-container"></div>
                  </label>
                </div>
                <p className="font-body-sm text-xs text-on-surface-variant">
                  Instant webhook notifications upon senior auditor sign-off or carrier rejection.
                </p>
              </div>
            </div>
          </section>

          {/* SECTION 5: AI Investigation Preferences */}
          <section
            id="ai-preferences"
            className="p-space-lg sm:p-space-xl rounded-2xl bg-surface-container-lowest shadow-sm border border-surface-container flex flex-col gap-space-lg"
          >
            <div className="flex flex-col gap-1 pb-space-sm border-b border-surface-container">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[22px]">smart_toy</span>
                <h2 className="font-headline-md text-lg sm:text-headline-md font-bold text-on-surface tracking-tight">
                  AI Investigation Preferences
                </h2>
              </div>
              <p className="font-body-sm text-xs text-on-surface-variant">
                Core intelligence and explainability configuration for the refund engine.
              </p>
            </div>

            {/* Obsidian Copilot Engine Status Pill */}
            <div className="p-space-md rounded-2xl bg-inverse-surface text-inverse-on-surface flex items-center justify-between shadow-md border border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-surface-container-highest/20 flex items-center justify-center text-primary-container">
                  <span className="material-symbols-outlined text-[20px]">psychology</span>
                </div>
                <div>
                  <span className="font-label-md text-xs sm:text-sm font-semibold text-inverse-on-surface">
                    Agent Travel Autonomous Engine
                  </span>
                  <p className="font-body-sm text-xs text-tertiary-fixed-dim">
                    Zero-loss carrier telemetry reconciler active
                  </p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-primary-container text-on-primary-container font-label-sm text-[11px] font-bold uppercase tracking-wider">
                Nominal
              </span>
            </div>

            <div className="flex flex-col gap-space-sm">
              {/* Toggle 1 */}
              <div className="p-space-md rounded-xl bg-surface-container-low border border-surface-container flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary text-[20px]">neurology</span>
                  <div>
                    <span className="font-label-md text-xs sm:text-sm font-semibold text-on-surface">AI Investigation</span>
                    <p className="font-body-sm text-xs text-on-surface-variant">
                      Autonomous multi-agent parsing of airline PNRs and ticket coupon history.
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={aiPreferences.aiInvestigation}
                    onChange={(e) => setAiPreferences({ ...aiPreferences, aiInvestigation: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-surface-container-highest peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-surface-container-lowest after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-surface-container-lowest after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-container"></div>
                </label>
              </div>

              {/* Toggle 2 */}
              <div className="p-space-md rounded-xl bg-surface-container-low border border-surface-container flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-secondary text-[20px]">insights</span>
                  <div>
                    <span className="font-label-md text-xs sm:text-sm font-semibold text-on-surface">AI Recommendations</span>
                    <p className="font-body-sm text-xs text-on-surface-variant">
                      Auto-computes suggested monetary payout based on fare class and disruption cause.
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={aiPreferences.aiRecommendations}
                    onChange={(e) => setAiPreferences({ ...aiPreferences, aiRecommendations: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-surface-container-highest peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-surface-container-lowest after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-surface-container-lowest after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-container"></div>
                </label>
              </div>

              {/* Toggle 3 */}
              <div className="p-space-md rounded-xl bg-surface-container-low border border-surface-container flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary text-[20px]">description</span>
                  <div>
                    <span className="font-label-md text-xs sm:text-sm font-semibold text-on-surface">Evidence-Based Reasoning</span>
                    <p className="font-body-sm text-xs text-on-surface-variant">
                      Generates human-readable citation trees linked to DGCA & EU261 regulatory clauses.
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={aiPreferences.evidenceBasedReasoning}
                    onChange={(e) => setAiPreferences({ ...aiPreferences, evidenceBasedReasoning: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-surface-container-highest peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-surface-container-lowest after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-surface-container-lowest after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-container"></div>
                </label>
              </div>

              {/* Toggle 4 */}
              <div className="p-space-md rounded-xl bg-surface-container-low border border-surface-container flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-outline text-[20px]">verified</span>
                  <div>
                    <span className="font-label-md text-xs sm:text-sm font-semibold text-on-surface">
                      Human Approval for Significant Refunds
                    </span>
                    <p className="font-body-sm text-xs text-on-surface-variant">
                      Forces supervisor electronic signature before any ledger adjustment executes.
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={aiPreferences.humanApprovalSignificant}
                    onChange={(e) => setAiPreferences({ ...aiPreferences, humanApprovalSignificant: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-surface-container-highest peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-surface-container-lowest after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-surface-container-lowest after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-container"></div>
                </label>
              </div>
            </div>

            {/* Note */}
            <div className="p-space-md rounded-xl bg-tertiary-fixed/30 border border-tertiary-fixed/60 flex items-start gap-space-sm">
              <span className="material-symbols-outlined text-secondary text-[22px] shrink-0 mt-0.5">shield</span>
              <div className="flex flex-col">
                <span className="font-label-md text-xs font-semibold text-on-surface">Governance Guarantee</span>
                <p className="font-body-sm text-xs text-on-tertiary-container mt-0.5">
                  AI investigates evidence and recommends actions. It does not make irreversible financial decisions on its own.
                </p>
              </div>
            </div>
          </section>

          {/* Bottom Page Actions (Sticky Bar) */}
          <div className="sticky bottom-6 z-30 p-space-md rounded-2xl bg-surface-container-lowest/95 backdrop-blur-md shadow-xl border border-surface-container flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-outline">
              <span className="material-symbols-outlined text-primary text-[18px]">lock_reset</span>
              <span className="font-body-sm text-xs text-on-surface-variant">
                All changes logged to platform audit ledger.
              </span>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              <button
                onClick={() => {
                  setOrgName(settings.orgName);
                  setCurrency(settings.currency);
                  setPolicies(settings.policies);
                  setRiskRules(settings.riskRules);
                }}
                className="px-space-md py-2.5 rounded-full font-label-md text-xs sm:text-sm text-on-surface-variant hover:bg-surface-container transition-colors cursor-pointer"
                type="button"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-space-xl py-2.5 rounded-full bg-primary-container text-on-primary-container font-label-md text-xs sm:text-sm font-semibold hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer disabled:opacity-60"
                type="button"
              >
                {isSaving ? (
                  <>
                    <span className="material-symbols-outlined text-[18px] animate-spin">refresh</span>
                    <span>Applying to Ledger...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[18px]">check_circle</span>
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
