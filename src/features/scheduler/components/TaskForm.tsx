"use client";

import { Icon } from "@iconify/react";
import { useState, useEffect } from "react";
import MultiCreatableSelect from "@/shared/ui/MultiCreatableSelect";

const inputClass = "w-full rounded-lg border border-app-border bg-canvas p-2 text-sm text-text-hi focus:outline-none focus:ring-2 focus:ring-brand-500";
// A fixed clock time only makes sense for whole-day frequencies — mirrors the same set in
// features/scheduler/lib/frequency.ts (kept separate since that file is deliberately
// Inngest/Supabase-import-free for reuse in the cron due-check).
const TIME_OF_DAY_FREQUENCIES = new Set(["Daily", "Weekly", "Monthly"]);
const LEAD_TASK_TYPES = new Set(["Google Maps Leads", "LinkedIn People Leads", "Reddit Mentions"]);
const pillClass = "flex items-center gap-1 rounded-full bg-surface-2 px-2 py-1 text-sm text-text-hi";
const secondaryButtonClass = "rounded-lg bg-surface-2 px-3 py-1 text-text-hi hover:bg-app-border";

export default function TaskForm({
  task,
  setTask,
  mode,
  tenderTypes,
  isLoadingParent,
}: {
  task: any;
  setTask: (updater: any) => void;
  mode: "light" | "dark";
  tenderTypes: string[];
  isLoadingParent: boolean;
}) {
  const [searchTerms, setSearchTerms] = useState<{ id: number; term: string }[]>([]);
  const [isLoadingSearchTerms, setIsLoadingSearchTerms] = useState(false);
  const [countryOptions, setCountryOptions] = useState<string[]>([]);
  const [isLoadingCountries, setIsLoadingCountries] = useState(false);
  const [linkedinPhraseOptions, setLinkedinPhraseOptions] = useState<string[]>([]);
  const [isLoadingLinkedinPhrases, setIsLoadingLinkedinPhrases] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showNotifications, setShowNotifications] = useState(
    task.emailNotificationsEnabled || task.smsNotificationsEnabled || task.slackNotificationsEnabled
  );
  const [currentEmail, setCurrentEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);

  const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleAddEmail = () => {
    if (!currentEmail) return setEmailError("Please enter an email address.");
    if (!isValidEmail(currentEmail)) return setEmailError("Please enter a valid email address.");
    const emails = Array.isArray(task.customEmails) ? [...task.customEmails] : [];
    if (emails.includes(currentEmail)) return setEmailError("This email is already added.");
    const updatedEmails = [...emails, currentEmail];
    setTask((prev: any) => ({ ...prev, customEmails: updatedEmails, custom_emails: updatedEmails.join(",") }));
    setCurrentEmail("");
    setEmailError(null);
  };

  const handleRemoveEmail = (email: string) => {
    const emails = Array.isArray(task.customEmails) ? [...task.customEmails] : [];
    const updatedEmails = emails.filter((e) => e !== email);
    setTask((prev: any) => ({ ...prev, customEmails: updatedEmails, custom_emails: updatedEmails.join(",") }));
  };

  useEffect(() => {
    const fetchSearchTerms = async () => {
      setIsLoadingSearchTerms(true);
      setError(null);
      try {
        const res = await fetch("/api/search-terms");
        const data = await res.json();
        setSearchTerms(Array.isArray(data.search_terms) ? data.search_terms : []);
      } catch (err: any) {
        setError(err.message || "Failed to fetch search terms.");
      } finally {
        setIsLoadingSearchTerms(false);
      }
    };
    fetchSearchTerms();
  }, []);

  useEffect(() => {
    const fetchCountries = async () => {
      setIsLoadingCountries(true);
      try {
        const res = await fetch("/api/countries");
        const data = await res.json();
        setCountryOptions(Array.isArray(data) ? data.map((c: { country_name: string }) => c.country_name) : []);
      } catch {
        setCountryOptions([]);
      } finally {
        setIsLoadingCountries(false);
      }
    };
    fetchCountries();
  }, []);

  useEffect(() => {
    const fetchLinkedinPhrases = async () => {
      setIsLoadingLinkedinPhrases(true);
      try {
        const res = await fetch("/api/linkedin-search-phrases");
        const data = await res.json();
        setLinkedinPhraseOptions(
          Array.isArray(data.linkedin_search_phrases) ? data.linkedin_search_phrases.map((p: { phrase: string }) => p.phrase) : []
        );
      } catch {
        setLinkedinPhraseOptions([]);
      } finally {
        setIsLoadingLinkedinPhrases(false);
      }
    };
    fetchLinkedinPhrases();
  }, []);

  useEffect(() => {
    if (!task.customEmails && !task.custom_emails) {
      setTask((prev: any) => ({ ...prev, customEmails: [], custom_emails: "" }));
    } else if (task.custom_emails && !Array.isArray(task.customEmails)) {
      const emailArray = (task.custom_emails || "").split(",").filter((email: string) => email.trim());
      setTask((prev: any) => ({ ...prev, customEmails: emailArray }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task.customEmails, task.custom_emails]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setTask((prev: any) => ({ ...prev, [name]: value }));
  };

  useEffect(() => {
    setShowNotifications(task.emailNotificationsEnabled || task.smsNotificationsEnabled || task.slackNotificationsEnabled);
  }, [task.emailNotificationsEnabled, task.smsNotificationsEnabled, task.slackNotificationsEnabled]);

  return (
    <div className="max-h-[70vh] flex-1 space-y-6 overflow-y-auto p-6">
      <div>
        <label className="mb-2 block text-sm font-medium text-text-hi">Task Name</label>
        <input type="text" name="name" value={task.name} onChange={handleInputChange} className={inputClass} placeholder="Enter task name" />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-text-hi">Tender Type</label>
        <select
          name="tenderType"
          value={task.tenderType}
          onChange={(e) => setTask((prev: any) => ({ ...prev, tenderType: e.target.value, tender_type: e.target.value }))}
          className={inputClass}
        >
          {tenderTypes.length > 0 ? (
            tenderTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))
          ) : (
            <option value="" disabled>
              No tender types available
            </option>
          )}
        </select>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-text-hi">Frequency</label>
        <select name="frequency" value={task.frequency} onChange={handleInputChange} className={inputClass}>
          <option value="Hourly">Hourly</option>
          <option value="Every 3 Hours">Every 3 Hours</option>
          <option value="Every 12 Hours">Every 12 Hours</option>
          <option value="Daily">Daily</option>
          <option value="Weekly">Weekly</option>
          <option value="Monthly">Monthly</option>
        </select>
      </div>

      {TIME_OF_DAY_FREQUENCIES.has(task.frequency) && (
        <div>
          <label className="mb-2 block text-sm font-medium text-text-hi">
            Run Time <span className="font-normal text-text-lo">(UTC — pins the run to this time instead of just "every 24h from last run")</span>
          </label>
          <input type="time" name="runTime" value={task.runTime || "09:00"} onChange={handleInputChange} className={inputClass} />
        </div>
      )}

      <div>
        <label className="mb-2 block text-sm font-medium text-text-hi">Priority</label>
        <select name="priority" value={task.priority} onChange={handleInputChange} className={inputClass}>
          <option value="Low">Low</option>
          <option value="Medium">Medium</option>
          <option value="High">High</option>
        </select>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-text-hi">
          {LEAD_TASK_TYPES.has(task.tenderType) ? "Search Term" : "Search Term / Keyword"}
          {task.tenderType !== "Search Query Tenders" && !LEAD_TASK_TYPES.has(task.tenderType) && (
            <span className="ml-1 font-normal text-text-lo">(optional — narrows results to tenders matching these topics)</span>
          )}
          {LEAD_TASK_TYPES.has(task.tenderType) && (
            <span className="ml-1 font-normal text-text-lo">(only the first term is used — this is what gets searched each run)</span>
          )}
        </label>
        {error && <p className="mb-2 text-sm text-status-danger">Error: {error}</p>}
        <MultiCreatableSelect
          value={task.searchTerms}
          onChange={(values) => setTask((prev: any) => ({ ...prev, searchTerms: values, search_terms: values }))}
          options={searchTerms.map((t) => t.term)}
          placeholder="Select or type a keyword..."
          mode={mode}
          isLoading={isLoadingSearchTerms}
        />
      </div>

      {task.tenderType === "LinkedIn Tenders" && (
        <div>
          <label className="mb-2 block text-sm font-medium text-text-hi">
            Search Phrases{" "}
            <span className="font-normal text-text-lo">
              (each one is a separate paid search query per run — fewer phrases means lower cost; defaults to a built-in list if left empty)
            </span>
          </label>
          <MultiCreatableSelect
            value={task.linkedinSearchPhrases?.length ? task.linkedinSearchPhrases : linkedinPhraseOptions}
            onChange={(values) => setTask((prev: any) => ({ ...prev, linkedinSearchPhrases: values, linkedin_search_phrases: values }))}
            options={linkedinPhraseOptions}
            placeholder="Select or type a search phrase..."
            mode={mode}
            isLoading={isLoadingLinkedinPhrases}
          />
        </div>
      )}

      {task.tenderType !== "Reddit Mentions" && (
        <div>
          <label className="mb-2 block text-sm font-medium text-text-hi">
            {task.tenderType === "Google Maps Leads" || task.tenderType === "LinkedIn People Leads" ? (
              <>
                Location <span className="font-normal text-text-lo">(e.g. "Nairobi, Kenya" — only the first entry is used)</span>
              </>
            ) : (
              <>
                Countries / Regions <span className="font-normal text-text-lo">(optional — narrows results to these markets)</span>
              </>
            )}
          </label>
          <MultiCreatableSelect
            value={task.countries || []}
            onChange={(values) => setTask((prev: any) => ({ ...prev, countries: values }))}
            options={countryOptions}
            placeholder="Select or type a country/region..."
            mode={mode}
            isLoading={isLoadingCountries}
          />
        </div>
      )}

      <div className="flex items-center space-x-3">
        <label className="text-sm font-medium text-text-hi">Enable Notifications?</label>
        <div
          className={`relative inline-flex h-6 w-11 cursor-pointer items-center rounded-full transition-colors ${showNotifications ? "bg-brand-500" : "bg-surface-2"}`}
          onClick={() => {
            const newState = !showNotifications;
            setShowNotifications(newState);
            if (!newState) {
              setTask((prev: any) => ({
                ...prev,
                emailNotificationsEnabled: false,
                smsNotificationsEnabled: false,
                slackNotificationsEnabled: false,
                email_notifications_enabled: false,
                sms_notifications_enabled: false,
                slack_notifications_enabled: false,
              }));
            } else if (!task.emailNotificationsEnabled && !task.smsNotificationsEnabled && !task.slackNotificationsEnabled) {
              setTask((prev: any) => ({ ...prev, emailNotificationsEnabled: true, email_notifications_enabled: true }));
            }
          }}
        >
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${showNotifications ? "translate-x-6" : "translate-x-1"}`} />
        </div>
      </div>

      {showNotifications && (
        <div className="mt-4 rounded-lg border border-app-border p-4">
          <h4 className="mb-2 text-sm font-medium text-text-hi">Notification Settings</h4>
          <div className="space-y-3">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={task.emailNotificationsEnabled}
                onChange={() => setTask((prev: any) => ({ ...prev, emailNotificationsEnabled: !prev.emailNotificationsEnabled, email_notifications_enabled: !prev.emailNotificationsEnabled }))}
                disabled={isLoadingParent}
                className="mr-2"
              />
              <span className="text-text-lo">Send email notification when an open tender is found</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={task.smsNotificationsEnabled}
                onChange={() => setTask((prev: any) => ({ ...prev, smsNotificationsEnabled: !prev.smsNotificationsEnabled, sms_notifications_enabled: !prev.smsNotificationsEnabled }))}
                disabled={isLoadingParent}
                className="mr-2"
              />
              <span className="text-text-lo">Send SMS notification when an open tender is found</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={task.slackNotificationsEnabled}
                onChange={() => setTask((prev: any) => ({ ...prev, slackNotificationsEnabled: !prev.slackNotificationsEnabled, slack_notifications_enabled: !prev.slackNotificationsEnabled }))}
                disabled={isLoadingParent}
                className="mr-2"
              />
              <span className="text-text-lo">Send Slack notification to #tenders channel when an open tender is found</span>
            </label>
            <div className="mt-4">
              <label className="mb-1 block text-text-lo">Additional Email Recipients</label>
              <div className="mb-2 flex gap-2">
                <input
                  type="email"
                  value={currentEmail}
                  onChange={(e) => {
                    setCurrentEmail(e.target.value);
                    setEmailError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddEmail();
                    }
                  }}
                  placeholder="e.g., user@example.com"
                  className={`${inputClass} ${emailError ? "border-status-danger" : ""}`}
                  disabled={isLoadingParent}
                />
                <button onClick={handleAddEmail} className={secondaryButtonClass} disabled={isLoadingParent}>
                  Add
                </button>
              </div>
              {emailError && <p className="mb-2 text-sm text-status-danger">{emailError}</p>}
              {Array.isArray(task.customEmails) && task.customEmails.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {task.customEmails.map((email: string, index: number) => (
                    <span key={index} className={pillClass}>
                      {email}
                      <button onClick={() => handleRemoveEmail(email)} className="focus:outline-none" disabled={isLoadingParent}>
                        <Icon icon="solar:close-circle-broken" width={16} height={16} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <p className="mb-1 mt-4 text-sm italic text-text-lo">
                By default, Tender notifications will be sent to<span className="underline"> strategic@growthpad.co.ke</span>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
