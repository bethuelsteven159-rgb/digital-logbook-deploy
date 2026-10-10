import { useCallback, useEffect, useRef, useState } from 'react';

import { useNavigate, useParams } from 'react-router-dom';

import Sidebar from '../../components/Sidebar';
import { X, Plus, Zap, Check, Users } from 'lucide-react';
import EditProjectModal from '../../components/EditProjectModal';
import NewEntryModal from './NewEntryModal';
import EditEntryModal from './EditEntryModal';
import EntryHistoryModal from './EntryHistoryModal';
import EntryDetailsModal from './EntryDetailsModal';
import AutomationRulesModal from './AutomationRulesModal';
import SharingModal from './SharingModal';
import CalendarView from './CalendarView';
import BoardView from './BoardView';
import RecurringEntriesModal from './RecurringEntriesModal';
import AiProjectInsight from './AiProjectInsight';
import LearningVideos from './LearningVideos';

import {
  createProjectEntry,
  deleteProjectEntry,
  archiveProjectEntry,
  unarchiveProjectEntry,
  fetchProjectDetails,
  fetchSavedFilters,
  createSavedFilter,
  applySavedFilter,
  deleteSavedFilter,
  updateSavedFilter,
  markEntryComplete,
  fetchOutstandingEntries,
  fetchIncompleteEntries,
  searchProjectEntries,
} from '../../api/projectDetailsApi';

import { fetchProjects, setProjectArchived, updateProject } from '../../api/projectsApi';

import useOnlineStatus from '../../hooks/useOnlineStatus';
import {
  getQueueForProject,
  addToQueue,
  removeFromQueue,
  updateQueueItem,
} from '../../offline/entryQueue';

import {
  updateChecklistItem,
  deleteChecklistItem,
  updateProjectReferences,
  updateEntry,
} from '../../api/entryFeaturesApi';

import { generateDueRecurringEntries } from '../../api/recurringEntriesApi';
export default function ProjectDetails() {
  const { id } = useParams();

  const navigate = useNavigate();

  const [collapsed, setSidebarCollapsed] = useState(false);

  const [details, setDetails] = useState(null);

  const [projects, setProjects] = useState([]);

  const [projectReferenceSaving, setProjectReferenceSaving] = useState(false);

  const [showProjectReferenceModal, setShowProjectReferenceModal] = useState(false);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState('');

  const [showEntryModal, setShowEntryModal] = useState(false);

  const [showEditEntryModal, setShowEditEntryModal] = useState(false);

  const [selectedEntryForEdit, setSelectedEntryForEdit] = useState(null);

  const [selectedEntryForDetails, setSelectedEntryForDetails] = useState(null);

  const [selectedEntryForHistory, setSelectedEntryForHistory] = useState(null);

  const [entryDeleteSaving, setEntryDeleteSaving] = useState(false);
  const [archiveSaving, setArchiveSaving] = useState(false);
  const [showArchivedEntries, setShowArchivedEntries] = useState(false);

  const [checklistSaving, setChecklistSaving] = useState({});

  const [entryView, setEntryView] = useState('list');

  const [projectActionSaving, setProjectActionSaving] = useState(false);

  const [showEditProjectModal, setShowEditProjectModal] = useState(false);

  const [showAutomationRulesModal, setShowAutomationRulesModal] = useState(false);

  const [showSharingModal, setShowSharingModal] = useState(false);

  const [showRecurringModal, setShowRecurringModal] = useState(false);

  const [generatedNotice, setGeneratedNotice] = useState('');

  const generateDueRef = useRef(null);

  const isOnline = useOnlineStatus();

  const [pendingEntries, setPendingEntries] = useState(() => getQueueForProject(id));

  const [syncing, setSyncing] = useState(false);

  const [savedFilters, setSavedFilters] = useState([]);
  const [activeFilterId, setActiveFilterId] = useState(null);
  const [filteredEntries, setFilteredEntries] = useState(null);
  const [entryStatusView, setEntryStatusView] = useState(null);
  const [entrySearchQuery, setEntrySearchQuery] = useState('');
  const [entrySearchField, setEntrySearchField] = useState('all');

  const [searchQuery, setSearchQuery] = useState('');
  const [searchFromDate, setSearchFromDate] = useState('');
  const [searchToDate, setSearchToDate] = useState('');
  const [searchMinDuration, setSearchMinDuration] = useState('');
  const [searchMaxDuration, setSearchMaxDuration] = useState('');
  const [searchCompleted, setSearchCompleted] = useState('all');
  const [searchSort, setSearchSort] = useState('newest');
  const [searchCustomFields, setSearchCustomFields] = useState([]);
  const [searchActive, setSearchActive] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [showSearchFilters, setShowSearchFilters] = useState(false);

  const [showFilterBuilder, setShowFilterBuilder] = useState(false);
  const [editingFilterId, setEditingFilterId] = useState(null);
  const [filterName, setFilterName] = useState('');
  const [filterConditions, setFilterConditions] = useState([
    { targetField: 'durationMinutes', operator: 'greater_than', value: '' },
  ]);

  const loadProject = useCallback(async () => {
    if (!id) {
      setError('No project ID was provided.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');

      // Generate due recurring entries once per project load. The
      // ref is set before awaiting so repeat renders (including
      // StrictMode double-invocation) never post twice, and the
      // POST itself is idempotent on the server.
      if (generateDueRef.current !== id) {
        generateDueRef.current = id;

        try {
          const generation = await generateDueRecurringEntries(id);

          setGeneratedNotice(
            generation?.generatedCount > 0
              ? generation.generatedCount === 1
                ? '1 recurring entry was generated.'
                : `${generation.generatedCount} recurring entries were generated.`
              : '',
          );
        } catch (generationError) {
          console.error('Failed to generate recurring entries:', generationError);
        }
      }

      const data = await fetchProjectDetails(id);
      setDetails(data);

      try {
        const allProjects = await fetchProjects('all');
        setProjects(Array.isArray(allProjects) ? allProjects : []);
      } catch (projectsError) {
        console.error('Failed to load projects for references:', projectsError);
        setProjects([]);
      }
      if (typeof fetchSavedFilters === 'function') {
        const filters = await fetchSavedFilters(id);
        setSavedFilters(filters || []);
      }
    } catch (requestError) {
      console.error('Failed to load project:', requestError);

      setError(requestError.message || 'Failed to load project.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadProject();
  }, [loadProject]);

  const syncPendingEntries = useCallback(async () => {
    const queue = getQueueForProject(id);

    if (queue.length === 0) {
      return;
    }

    setSyncing(true);

    for (const item of queue) {
      updateQueueItem(item.localId, { status: 'syncing' });

      try {
        await createProjectEntry(item.projectId, item.payload);

        removeFromQueue(item.localId);

        setPendingEntries((current) => current.filter((entry) => entry.localId !== item.localId));
      } catch (syncError) {
        updateQueueItem(item.localId, {
          status: 'failed',
          lastError: syncError.message || 'Sync failed',
        });

        setPendingEntries((current) =>
          current.map((entry) =>
            entry.localId === item.localId
              ? {
                  ...entry,
                  status: 'failed',
                  lastError: syncError.message,
                }
              : entry,
          ),
        );
      }
    }

    setSyncing(false);
    await loadProject();
  }, [id, loadProject]);

  useEffect(() => {
    if (isOnline && pendingEntries.length > 0) {
      syncPendingEntries();
    }
    // Only re-run when connectivity flips, not on every pendingEntries change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline]);

  useEffect(() => {
    if (!details || !window.location.hash) return;
    const targetId = window.location.hash.slice(1);
    const timer = window.setTimeout(() => {
      document.getElementById(targetId)?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }, 100);
    return () => window.clearTimeout(timer);
  }, [details]);

  function openEntryDetails(entry) {
    setSelectedEntryForDetails(entry);
  }

  function openEditEntryModal(entry) {
    setSelectedEntryForDetails(null);
    setSelectedEntryForEdit(entry);
    setShowEditEntryModal(true);
  }

  async function handleChecklistToggle(entryId, itemId, completed) {
    const key = `${entryId}:${itemId}`;

    try {
      setChecklistSaving((current) => ({ ...current, [key]: true }));
      setError('');

      const updated = await updateChecklistItem(id, entryId, itemId, { completed });

      setDetails((current) => {
        if (!current) return current;
        return {
          ...current,
          entries: current.entries.map((candidate) =>
            candidate.id !== entryId
              ? candidate
              : {
                  ...candidate,
                  checklist: (candidate.checklist || []).map((item) =>
                    item.id === itemId
                      ? { ...item, completed: Boolean(updated?.completed ?? completed) }
                      : item,
                  ),
                },
          ),
        };
      });

      setSelectedEntryForDetails((current) => {
        if (!current || current.id !== entryId) return current;
        return {
          ...current,
          checklist: (current.checklist || []).map((item) =>
            item.id === itemId
              ? { ...item, completed: Boolean(updated?.completed ?? completed) }
              : item,
          ),
        };
      });
    } catch (requestError) {
      setError(requestError.message || 'Failed to update checklist item.');
    } finally {
      setChecklistSaving((current) => {
        const next = { ...current };
        delete next[key];
        return next;
      });
    }
  }

  async function handleUpdateEntry(entryId, payload) {
    try {
      await updateEntry(id, entryId, payload);
      setShowEditEntryModal(false);
      setSelectedEntryForEdit(null);
      await loadProject();
    } catch (requestError) {
      console.error('Failed to update entry:', requestError);
      throw requestError;
    }
  }

  async function handleDeleteEntry(entry) {
    if (!entry?.id) {
      return;
    }

    try {
      setEntryDeleteSaving(true);
      setError('');

      await deleteProjectEntry(id, entry.id);

      setSelectedEntryForDetails(null);
      setSelectedEntryForEdit(null);
      setShowEditEntryModal(false);

      await loadProject();
    } catch (requestError) {
      console.error('Failed to delete entry:', requestError);
      setError(requestError.message || 'Failed to delete entry.');
    } finally {
      setEntryDeleteSaving(false);
    }
  }

async function handleArchiveEntry(entry) {
  if (!entry?.id) {
    return;
  }

  try {
    setArchiveSaving(true);
    setError("");

    await archiveProjectEntry(id, entry.id);

    setFilteredEntries((current) =>
      current ? current.filter((item) => item.id !== entry.id) : current,
    );

    setSelectedEntryForDetails(null);
    setSelectedEntryForEdit(null);
    setShowEditEntryModal(false);

    await loadProject();
  } catch (requestError) {
    console.error("Failed to archive entry:", requestError);
    setError(requestError.message || "Failed to archive entry.");
  } finally {
    setArchiveSaving(false);
  }
}

async function handleUnarchiveEntry(entry) {
  if (!entry?.id) {
    return;
  }

  try {
    setArchiveSaving(true);
    setError("");

    await unarchiveProjectEntry(id, entry.id);

    setSelectedEntryForDetails(null);
    setFilteredEntries((current) =>
      current ? current.filter((item) => item.id !== entry.id) : current,
    );

    await loadProject();
  } catch (requestError) {
    console.error("Failed to unarchive entry:", requestError);
    setError(requestError.message || "Failed to unarchive entry.");
  } finally {
    setArchiveSaving(false);
  }
}

  async function handleCreateEntry(payload) {
    if (!isOnline) {
      const queued = addToQueue(id, payload);

      setPendingEntries((current) => [...current, queued]);
      setShowEntryModal(false);

      return;
    }

    try {
      await createProjectEntry(id, payload);

      setShowEntryModal(false);

      /*
       * Reload the complete project after creation.
       *
       * This refreshes:
       * - entries
       * - total entries
       * - logged time
       * - last activity
       * - project fields
       *
       * It also means fields added while creating
       * the entry immediately become project fields.
       */
      await loadProject();
    } catch (requestError) {
      console.error('Failed to create entry:', requestError);

      // A real network failure (server unreachable) has no HTTP status.
      // A validation/auth error (400/401/etc) does — don't silently
      // queue those, since retrying them later would just fail again.
      const isNetworkFailure = !requestError.status;

      if (isNetworkFailure) {
        const queued = addToQueue(id, payload);

        setPendingEntries((current) => [...current, queued]);
        setShowEntryModal(false);

        return;
      }

      throw requestError;
    }
  }

  async function handleUpdateProjectReferences(referencedProjectIds) {
    try {
      setProjectReferenceSaving(true);
      setError('');

      await updateProjectReferences(id, referencedProjectIds);

      setShowProjectReferenceModal(false);
      await loadProject();
    } catch (requestError) {
      console.error('Failed to update project references:', requestError);

      setError(requestError.message || 'Failed to update project references.');
    } finally {
      setProjectReferenceSaving(false);
    }
  }

  async function handleCreateSavedFilter(payload) {
    try {
      const newFilter = await createSavedFilter(id, payload);

      setSavedFilters((current) => [newFilter, ...current]);
    } catch (submitError) {
      console.error('Failed to create saved filter:', submitError);
    }
  }

  async function handleUpdateSavedFilter(filterId, payload) {
    try {
      const updatedFilter = await updateSavedFilter(filterId, payload);

      setSavedFilters((current) =>
        current.map((filter) =>
          filter.id === filterId ? updatedFilter : filter,
        ),
      );
    } catch (submitError) {
      console.error('Failed to update saved filter:', submitError);
    }
  }

  function handleOpenEditFilter(filter) {
    setEditingFilterId(filter.id);
    setFilterName(filter.name);
    setFilterConditions(
      filter.criteria.map((criterion) => ({
        targetField: criterion.fieldName || criterion.fieldId,
        operator: criterion.operator,
        value: criterion.value,
      })),
    );
    setShowFilterBuilder(true);
  }

  async function handleApplyFilter(filterId) {
    setShowArchivedEntries(false);

    if (!filterId) {
      setActiveFilterId(null);
      setFilteredEntries(null);
      return;
    }

    try {
      setSearchActive(false);
      setSearchError('');

      const results = await applySavedFilter(id, filterId);

      setActiveFilterId(filterId);
      setFilteredEntries(results || []);
    } catch (applyError) {
      console.error('Failed to apply saved filter:', applyError);
    }
  }

  async function handleDeleteFilter(filterId) {
    try {
      await deleteSavedFilter(filterId);

      setSavedFilters((current) => current.filter((filter) => filter.id !== filterId));

      if (activeFilterId === filterId) {
        setActiveFilterId(null);
        setFilteredEntries(null);
      }
    } catch (deleteError) {
      console.error('Failed to delete saved filter:', deleteError);
    }
  }

  function addFilterCondition() {
    setFilterConditions((current) => [
      ...current,
      { targetField: 'durationMinutes', operator: 'greater_than', value: '' },
    ]);
  }

  function updateFilterCondition(index, updates) {
    setFilterConditions((current) =>
      current.map((condition, i) => (i === index ? { ...condition, ...updates } : condition)),
    );
  }

  function removeFilterCondition(index) {
    setFilterConditions((current) => current.filter((_, i) => i !== index));
  }
  async function handleMarkComplete(entryId) {
    try {
      await markEntryComplete(id, entryId);
      await loadProject();
    } catch (completeError) {
      console.error('Failed to mark entry complete:', completeError);
    }
  }

  async function handleShowOverdue() {
    setShowArchivedEntries(false);

    if (entryStatusView === 'overdue') {
      setEntryStatusView(null);
      setFilteredEntries(null);
      setActiveFilterId(null);
      return;
    }

    try {
      setSearchActive(false);
      setSearchError('');

      const results = await fetchOutstandingEntries(id);

      setEntryStatusView('overdue');
      setActiveFilterId(null);
      setFilteredEntries(results || []);
    } catch (outstandingError) {
      console.error('Failed to load overdue entries:', outstandingError);
    }
  }

  async function handleShowIncomplete() {
    setShowArchivedEntries(false);

    if (entryStatusView === 'incomplete') {
      setEntryStatusView(null);
      setFilteredEntries(null);
      setActiveFilterId(null);
      return;
    }

    try {
      setSearchActive(false);
      setSearchError('');

      const results = await fetchIncompleteEntries(id);

      setEntryStatusView('incomplete');
      setActiveFilterId(null);
      setFilteredEntries(results || []);
    } catch (incompleteError) {
      console.error('Failed to load incomplete entries:', incompleteError);
    }
  }
  async function handleUpdateProject(payload) {
    try {
      await updateProject(id, payload);

      setShowEditProjectModal(false);
      setShowArchivedEntries(false);
      setActiveFilterId(null);
      setFilteredEntries(null);
      await loadProject();
    } catch (requestError) {
      console.error('Failed to update project:', requestError);

      throw requestError;
    }
  }

  async function handleToggleArchive() {
    const project = details?.project || {};
    const shouldArchive = !project.archivedAt;

    try {
      setProjectActionSaving(true);
      setError('');

      await setProjectArchived(id, shouldArchive);

      navigate(shouldArchive ? '/projects?tab=archived' : '/projects');
    } catch (requestError) {
      console.error('Failed to change archive status:', requestError);

      setError(requestError.message || 'Failed to update project archive status.');
    } finally {
      setProjectActionSaving(false);
    }
  }

  function handleRecurringChanged() {
    // Allow the next project load to generate occurrences for the
    // definitions that just changed.
    generateDueRef.current = null;
  }

  function handleCloseRecurringModal() {
    setShowRecurringModal(false);

    if (generateDueRef.current === null) {
      loadProject();
    }
  }

  function formatDate(value) {
    if (!value) {
      return '—';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return '—';
    }

    return new Intl.DateTimeFormat('en-ZA', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(date);
  }

  function addSearchCustomField() {
    const firstAvailableField = searchableFields[0]?.id || '';
    setSearchCustomFields((current) => [...current, { fieldId: firstAvailableField, value: '' }]);
  }

  function updateSearchCustomField(index, updates) {
    setSearchCustomFields((current) =>
      current.map((filter, filterIndex) =>
        filterIndex === index ? { ...filter, ...updates } : filter,
      ),
    );
  }

  function removeSearchCustomField(index) {
    setSearchCustomFields((current) => current.filter((_, filterIndex) => filterIndex !== index));
  }

  async function handleStructuredSearch(event) {
    event?.preventDefault();

    try {
      setSearching(true);
      setSearchError('');
      setError('');

      const completed =
        searchCompleted === 'completed'
          ? true
          : searchCompleted === 'incomplete'
            ? false
            : undefined;

      const results = await searchProjectEntries(id, {
        query: searchQuery,
        fromDate: searchFromDate,
        toDate: searchToDate,
        minDuration: searchMinDuration,
        maxDuration: searchMaxDuration,
        completed,
        sort: searchSort,
        customFields: searchCustomFields,
        archived: showArchivedEntries,
      });

      setActiveFilterId(null);
      setEntryStatusView(null);
      setFilteredEntries(Array.isArray(results) ? results : []);
      setSearchActive(true);
    } catch (requestError) {
      console.error('Failed to search entries:', requestError);
      setSearchError(requestError.message || 'Unable to search entries.');
    } finally {
      setSearching(false);
    }
  }

  function handleClearStructuredSearch() {
    setSearchQuery('');
    setSearchFromDate('');
    setSearchToDate('');
    setSearchMinDuration('');
    setSearchMaxDuration('');
    setSearchCompleted('all');
    setSearchSort('newest');
    setSearchCustomFields([]);
    setSearchError('');
    setSearchActive(false);
    setActiveFilterId(null);
    setEntryStatusView(null);

    if (showArchivedEntries) {
      loadArchivedEntries();
      return;
    }

    setFilteredEntries(null);
  }

  async function loadArchivedEntries(filters = {}) {
    try {
      setSearching(true);
      setSearchError('');

      const results = await searchProjectEntries(id, {
        sort: 'newest',
        ...filters,
        archived: true,
      });

      setFilteredEntries(Array.isArray(results) ? results : []);
    } catch (requestError) {
      console.error('Failed to load archived entries:', requestError);
      setSearchError(
        requestError.message || 'Unable to load archived entries.',
      );
    } finally {
      setSearching(false);
    }
  }

  async function handleToggleArchivedView() {
    setSearchQuery('');
    setSearchFromDate('');
    setSearchToDate('');
    setSearchMinDuration('');
    setSearchMaxDuration('');
    setSearchCompleted('all');
    setSearchSort('newest');
    setSearchCustomFields([]);
    setSearchError('');
    setSearchActive(false);
    setActiveFilterId(null);
    setEntryStatusView(null);

    if (showArchivedEntries) {
      setShowArchivedEntries(false);
      setFilteredEntries(null);
      return;
    }

    setShowArchivedEntries(true);
    await loadArchivedEntries();
  }

  function formatLoggedTime(minutes = 0) {
    const safeMinutes = Number(minutes) || 0;

    if (safeMinutes === 0) {
      return '0 hrs';
    }

    const hours = Math.floor(safeMinutes / 60);
    const remainingMinutes = safeMinutes % 60;

    if (hours === 0) {
      return `${remainingMinutes} min`;
    }

    if (remainingMinutes === 0) {
      return `${hours} hrs`;
    }

    return `${hours}h ${remainingMinutes}m`;
  }

  if (loading) {
    return (
      <div className="app-shell">
        <Sidebar
          collapsed={collapsed}
          onToggle={() => setSidebarCollapsed((current) => !current)}
        />

        <main className="app-main">
          <div className="project-status">
            <IconEntryLarge />
            <p>Loading project...</p>
          </div>
        </main>

        <ProjectDetailsStyles />
      </div>
    );
  }

  if (error && !details) {
    return (
      <div className="app-shell">
        <Sidebar
          collapsed={collapsed}
          onToggle={() => setSidebarCollapsed((current) => !current)}
        />

        <main className="app-main">
          <div className="project-status">
            <IconEntryLarge />
            <h2>Unable to load project</h2>
            <p>{error}</p>

            <button
              type="button"
              className="btn btn-primary"
              onClick={loadProject}
            >
              Try Again
            </button>

            <button
              type="button"
              className="breadcrumb-link"
              onClick={() => navigate('/projects')}
            >
              Back to Projects
            </button>
          </div>
        </main>

        <ProjectDetailsStyles />
      </div>
    );
  }

  if (!details) {
    return null;
  }

  const project = details.project || {};

  const stats = details.stats || {
    totalEntries: 0,
    loggedMinutes: 0,
    lastActivity: null,
  };

  const fields = Array.isArray(details.fields) ? details.fields : [];

  const searchableFields = (() => {
    const byId = new Map();

    fields.forEach((field) => {
      if (field?.id) {
        byId.set(field.id, field);
      }
    });

    const projectEntries = Array.isArray(details.entries)
      ? details.entries
      : [];

    projectEntries.forEach((entry) => {
      const values = Array.isArray(entry?.values) ? entry.values : [];

      values.forEach((value) => {
        const fieldId = value?.fieldId || value?.id;

        if (!fieldId || byId.has(fieldId)) {
          return;
        }

        byId.set(fieldId, {
          id: fieldId,
          name: value?.name || 'Custom field',
          fieldType: value?.type || 'text',
        });
      });
    });

    return Array.from(byId.values());
  })();

  const entries =
    filteredEntries !== null
      ? filteredEntries
      : Array.isArray(details.entries)
        ? details.entries
        : [];

  const baseDisplayEntries = [
    ...(showArchivedEntries ? [] : pendingEntries).map((item) => ({
      id: item.localId,
      name: item.payload.name,
      durationMinutes: item.payload.durationMinutes,
      tags: item.payload.tags || [],
      occurredAt: item.createdAt,
      values: [],
      isPending: true,
      syncStatus: item.status,
    })),
    ...entries,
  ];

  const normalizedEntrySearch = entrySearchQuery.trim().toLowerCase();

  function entryMatchesSearch(entry) {
    if (!normalizedEntrySearch) {
      return true;
    }

    const name = String(entry.name ?? '').toLowerCase();

    const tags = Array.isArray(entry.tags)
      ? entry.tags.map((tag) => String(tag ?? '').toLowerCase())
      : [];

    const values = Array.isArray(entry.values) ? entry.values : [];

    if (entrySearchField === 'name') {
      return name.includes(normalizedEntrySearch);
    }

    if (entrySearchField === 'tags') {
      return tags.some((tag) => tag.includes(normalizedEntrySearch));
    }

    if (entrySearchField.startsWith('custom:')) {
      const fieldId = entrySearchField.slice('custom:'.length);

      return values.some(
        (value) =>
          String(value?.fieldId ?? '') === fieldId &&
          String(value?.value ?? '')
            .toLowerCase()
            .includes(normalizedEntrySearch),
      );
    }

    return [
      name,
      ...tags,
      ...values.flatMap((value) => [
        String(value?.name ?? '').toLowerCase(),
        String(value?.value ?? '').toLowerCase(),
      ]),
    ].some((part) => part.includes(normalizedEntrySearch));
  }

  const displayEntries = normalizedEntrySearch
    ? baseDisplayEntries.filter(entryMatchesSearch)
    : baseDisplayEntries;

  const entrySearchCountText = normalizedEntrySearch
    ? `${displayEntries.length} of ${baseDisplayEntries.length} ${
        baseDisplayEntries.length === 1 ? 'entry' : 'entries'
      }`
    : `${baseDisplayEntries.length} ${
        baseDisplayEntries.length === 1 ? 'entry' : 'entries'
      }`;

  const usedFieldIds = new Set(
    entries.flatMap((entry) =>
      (Array.isArray(entry.values) ? entry.values : [])
        .map((value) => value.fieldId)
        .filter(Boolean),
    ),
  );

  const editableProject = {
    name: project.name || '',
    description: project.description || '',
    fields: fields.map((field) => ({
      id: field.id,
      label: field.name,
      type: field.fieldType,
    })),
  };

  return (
    <div className="app-shell">
      <Sidebar
        collapsed={collapsed}
        onToggle={() => setSidebarCollapsed((current) => !current)}
      />

      <main className="app-main">
        {/* Breadcrumb */}
        <div className="breadcrumb-bar">
          <button
            type="button"
            className="breadcrumb-link"
            onClick={() => navigate('/projects')}
          >
            Projects
          </button>

          <span className="breadcrumb-sep">
            <IconChevronRight />
          </span>

          <span className="breadcrumb-current">Project Details</span>
        </div>

        {/* Page header */}
        <header className="page-header">
          <div className="page-header-left">
            <p className="page-header-eyebrow">Project</p>

            <h1 className="page-header-title">
              {project.name || project.title || 'Untitled Project'}
            </h1>

            {project.description && (
              <p className="page-header-description">
                {project.description}
              </p>
            )}
          </div>

          <div className="page-header-actions">
            {!project.archivedAt && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setShowEntryModal(true)}
                disabled={projectActionSaving}
              >
                <IconPlus />
                Add New Entry
              </button>
            )}

            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setShowAutomationRulesModal(true)}
              disabled={projectActionSaving}
            >
              <Zap size={14} />
              Automation
            </button>

            {!project.archivedAt && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowRecurringModal(true)}
                disabled={projectActionSaving}
              >
                <IconRepeat />
                Recurring
              </button>
            )}

            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setShowSharingModal(true)}
              disabled={projectActionSaving}
            >
              <Users size={14} />
              Share
            </button>

            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setShowEditProjectModal(true)}
              disabled={projectActionSaving}
            >
              <IconEdit />
              Edit Project
            </button>

            <span
              className="header-action-divider"
              aria-hidden="true"
            />

            <button
              type="button"
              className="btn btn-ghost btn-ghost-archive"
              onClick={handleToggleArchive}
              disabled={projectActionSaving}
            >
              <IconArchive />
              {project.archivedAt ? 'Restore' : 'Archive'}
            </button>
          </div>
        </header>

        <div className="project-content">
          {error && (
            <div className="project-inline-error">
              {error}
            </div>
          )}

          {generatedNotice && (
            <div className="project-inline-notice">
              {generatedNotice}
            </div>
          )}

          <div className="project-stat-strip">
            <ProjectStat
              label="Total Entries"
              value={stats.totalEntries ?? entries.length}
              icon={<IconEntry />}
            />

            <div className="stat-divider" />

            <ProjectStat
              label="Logged Time"
              value={formatLoggedTime(stats.loggedMinutes)}
              icon={<IconClock />}
            />

            <div className="stat-divider" />

            <ProjectStat
              label="Last Activity"
              value={formatDate(stats.lastActivity)}
              icon={<IconCalendar />}
            />

            <div className="stat-divider" />

            <ProjectStat
              label="Created"
              value={formatDate(project.createdAt)}
              icon={<IconInfo />}
            />
          </div>

          <AiProjectInsight projectId={id} />

          <LearningVideos
            projectId={id}
            projectName={project.name}
          />

          <section className="references-section">
            <div className="references-section-header">
              <div>
                <h2 className="entries-title">
                  Project references
                </h2>

                <p className="references-description">
                  Projects related to this project.
                </p>
              </div>

              {!project.archivedAt && (
                <button
                  type="button"
                  className="btn btn-secondary btn-small"
                  onClick={() => setShowProjectReferenceModal(true)}
                  disabled={projectReferenceSaving}
                >
                  <IconLink />
                  Manage references
                </button>
              )}
            </div>

            {Array.isArray(details.references) &&
            details.references.length > 0 ? (
              <div className="entry-reference-list project-reference-list">
                {details.references.map((reference) => (
                  <button
                    type="button"
                    className="entry-reference-link"
                    key={reference.id}
                    onClick={() =>
                      navigate(
                        `/projects/${reference.referencedProjectId}`,
                      )
                    }
                  >
                    {reference.referencedProjectName}
                  </button>
                ))}
              </div>
            ) : (
              <div className="references-empty">
                <p className="references-empty-title">
                  No linked projects yet.
                </p>

                <p className="references-empty-hint">
                  Connect related projects to keep context together.
                </p>
              </div>
            )}
          </section>

          <section className="entries-section">
            <div className="entries-header entries-header-with-views">
              <div>
                <h2 className="entries-title">
                  {showArchivedEntries
                    ? 'Archived entries'
                    : 'Entries'}
                </h2>

                <span className="entries-count">
                  {entries.length}{' '}
                  {entries.length === 1 ? 'entry' : 'entries'}
                </span>

                <button
                  type="button"
                  className="btn-cancel"
                  style={{ marginLeft: '12px' }}
                  onClick={handleToggleArchivedView}
                  disabled={searching}
                >
                  {showArchivedEntries
                    ? 'Back to active entries'
                    : 'View archive'}
                </button>
              </div>

              {entries.length > 0 && (
                <div
                  className="segmented"
                  role="group"
                  aria-label="Entry view"
                >
                  {[
                    ['list', 'List'],
                    ['calendar', 'Calendar'],
                    ['board', 'Board'],
                  ].map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      className={`segmented-btn ${
                        entryView === value
                          ? 'segmented-btn-active'
                          : ''
                      }`}
                      aria-pressed={entryView === value}
                      onClick={() => setEntryView(value)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="entry-search-wrap">
              <select
                className="entry-search-field"
                aria-label="Search field"
                value={entrySearchField}
                onChange={(event) =>
                  setEntrySearchField(event.target.value)
                }
              >
                <option value="all">All fields</option>
                <option value="name">Entry name</option>
                <option value="tags">Tags</option>

                {fields
                  .filter(
                    (field) => field.fieldType !== 'computed',
                  )
                  .map((field) => (
                    <option
                      key={field.id}
                      value={`custom:${field.id}`}
                    >
                      {field.name}
                    </option>
                  ))}
              </select>

              <div className="entry-simple-search">
                <span className="entry-simple-search-icon">
                  ⌕
                </span>

                <input
                  type="search"
                  aria-label="Search entries"
                  placeholder={
                    entrySearchField === 'all'
                      ? 'Search entries by name, tag, or custom field value...'
                      : 'Search selected field...'
                  }
                  value={entrySearchQuery}
                  onChange={(event) =>
                    setEntrySearchQuery(event.target.value)
                  }
                />

                {entrySearchQuery && (
                  <button
                    type="button"
                    className="entry-simple-search-clear"
                    onClick={() => setEntrySearchQuery('')}
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            <div
              className="entry-search-status"
              aria-live="polite"
            >
              <span>{entrySearchCountText}</span>

              {normalizedEntrySearch &&
                displayEntries.length === 0 && (
                  <span>
                    No entries match &quot;
                    {entrySearchQuery.trim()}
                    &quot;.
                  </span>
                )}
            </div>

            <div className="saved-filters-bar">
              <div className="saved-filters-group">
                <select
                  className="form-select saved-filters-select"
                  value={activeFilterId || ''}
                  onChange={(event) => handleApplyFilter(event.target.value || null)}
                >
                  <option value="">All entries</option>
                  {savedFilters.map((filter) => (
                    <option key={filter.id} value={filter.id}>
                      {filter.name}
                    </option>
                  ))}
                </select>

                {activeFilterId && (
                  <>
                    <button
                      type="button"
                      className="btn btn-ghost btn-small"
                      onClick={() => {
                        const filter = savedFilters.find((f) => f.id === activeFilterId);

                        if (filter) {
                          handleOpenEditFilter(filter);
                        }
                      }}
                    >
                      Edit filter
                    </button>

                    <button
                      type="button"
                      className="btn btn-ghost btn-small"
                      onClick={() => handleDeleteFilter(activeFilterId)}
                    >
                      Delete filter
                    </button>
                  </>
                )}

                <button
                  type="button"
                  className="btn-add-field"
                  onClick={() => setShowFilterBuilder(true)}
                >
                  + New filter
                </button>
              </div>

              <div className="saved-filters-status" role="group" aria-label="Entry status">
                <button
                  type="button"
                  className={`status-toggle status-toggle--overdue ${entryStatusView === 'overdue' ? 'status-toggle--active' : ''}`}
                  aria-pressed={entryStatusView === 'overdue'}
                  onClick={handleShowOverdue}
                >
                  Overdue
                </button>

                <button
                  type="button"
                  className={`status-toggle ${entryStatusView === 'incomplete' ? 'status-toggle--active' : ''}`}
                  aria-pressed={entryStatusView === 'incomplete'}
                  onClick={handleShowIncomplete}
                >
                  Incomplete
                </button>
              </div>
            </div>

            <form className="structured-search" onSubmit={handleStructuredSearch}>
              <div className="structured-search-header">
                <div>
                  <h3 className="structured-search-title">Search entries</h3>
                  <p className="structured-search-description">
                    Find entries by name, tags, or custom field values. Add filters when you need to
                    narrow the results.
                  </p>
                </div>
                {searchActive && (
                  <span className="search-result-count">
                    {entries.length} result{entries.length === 1 ? '' : 's'}
                  </span>
                )}
              </div>

              <div className="structured-search-main-row">
                <input
                  id="entry-search-query"
                  className="form-input structured-search-main-input"
                  type="search"
                  aria-label="Search entries with filters"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search entries..."
                />
                <button type="submit" className="btn-save" disabled={searching}>
                  {searching ? 'Searching...' : 'Search'}
                </button>
              </div>

              <button
                type="button"
                className="search-more-filters-toggle"
                onClick={() => setShowSearchFilters((current) => !current)}
                aria-expanded={showSearchFilters}
              >
                {showSearchFilters ? '− Fewer filters' : '+ More filters'}
              </button>

              {showSearchFilters && (
                <div className="search-more-filters-panel">
                  <div className="structured-search-grid">
                    <div className="form-field">
                      <label className="form-label" htmlFor="entry-search-from">
                        From date
                      </label>
                      <input
                        id="entry-search-from"
                        className="form-input"
                        type="date"
                        value={searchFromDate}
                        onChange={(event) => setSearchFromDate(event.target.value)}
                      />
                    </div>
                    <div className="form-field">
                      <label className="form-label" htmlFor="entry-search-to">
                        To date
                      </label>
                      <input
                        id="entry-search-to"
                        className="form-input"
                        type="date"
                        value={searchToDate}
                        onChange={(event) => setSearchToDate(event.target.value)}
                      />
                    </div>
                    <div className="form-field">
                      <label className="form-label" htmlFor="entry-search-min-duration">
                        Min minutes
                      </label>
                      <input
                        id="entry-search-min-duration"
                        className="form-input"
                        type="number"
                        min="0"
                        value={searchMinDuration}
                        onChange={(event) => setSearchMinDuration(event.target.value)}
                        placeholder="Any"
                      />
                    </div>
                    <div className="form-field">
                      <label className="form-label" htmlFor="entry-search-max-duration">
                        Max minutes
                      </label>
                      <input
                        id="entry-search-max-duration"
                        className="form-input"
                        type="number"
                        min="0"
                        value={searchMaxDuration}
                        onChange={(event) => setSearchMaxDuration(event.target.value)}
                        placeholder="Any"
                      />
                    </div>
                    <div className="form-field">
                      <label className="form-label" htmlFor="entry-search-completed">
                        Status
                      </label>
                      <select
                        id="entry-search-completed"
                        className="form-select"
                        value={searchCompleted}
                        onChange={(event) => setSearchCompleted(event.target.value)}
                      >
                        <option value="all">All statuses</option>
                        <option value="completed">Completed</option>
                        <option value="incomplete">Incomplete</option>
                      </select>
                    </div>
                    <div className="form-field">
                      <label className="form-label" htmlFor="entry-search-sort">
                        Sort by
                      </label>
                      <select
                        id="entry-search-sort"
                        className="form-select"
                        value={searchSort}
                        onChange={(event) => setSearchSort(event.target.value)}
                      >
                        <option value="newest">Newest first</option>
                        <option value="oldest">Oldest first</option>
                        <option value="name">Name A-Z</option>
                        <option value="duration">Longest duration</option>
                      </select>
                    </div>
                  </div>

                  {searchableFields.length > 0 && (
                    <div className="specific-field-filters">
                      <div className="specific-field-filter-heading">
                        <span className="form-label">Custom fields</span>
                        <p className="specific-field-filter-help">
                          Search for a value within a particular field.
                        </p>
                      </div>

                      {searchCustomFields.map((filter, index) => (
                        <div
                          className="custom-search-filter-row"
                          key={`${index}-${filter.fieldId}`}
                        >
                          <select
                            className="form-select"
                            value={filter.fieldId}
                            onChange={(event) =>
                              updateSearchCustomField(index, { fieldId: event.target.value })
                            }
                          >
                            <option value="">Choose field</option>
                            {searchableFields.map((field) => (
                              <option key={field.id} value={field.id}>
                                {field.name}
                              </option>
                            ))}
                          </select>
                          <input
                            className="form-input"
                            type="text"
                            value={filter.value}
                            onChange={(event) =>
                              updateSearchCustomField(index, { value: event.target.value })
                            }
                            placeholder="Value to match"
                          />
                          <button
                            type="button"
                            className="field-row-remove"
                            onClick={() => removeSearchCustomField(index)}
                            aria-label="Remove field filter"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}

                      <button
                        type="button"
                        className="btn-add-field custom-field-add-button"
                        onClick={addSearchCustomField}
                      >
                        <Plus size={14} />
                        {searchCustomFields.length > 0 ? 'Add another field' : 'Add field filter'}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {searchError && <div className="structured-search-error">{searchError}</div>}

              {(searchActive ||
                searchQuery ||
                searchFromDate ||
                searchToDate ||
                searchMinDuration ||
                searchMaxDuration ||
                searchCompleted !== 'all' ||
                searchSort !== 'newest' ||
                searchCustomFields.length > 0) && (
                <div className="structured-search-clear-row">
                  <button
                    type="button"
                    className="btn-cancel"
                    onClick={handleClearStructuredSearch}
                    disabled={searching}
                  >
                    Clear search
                  </button>
                </div>
              )}
            </form>

            {(pendingEntries.length > 0 || !isOnline) && (
              <div className="offline-banner">
                {!isOnline && <span>You're offline — new entries will be saved locally.</span>}

                {isOnline && pendingEntries.length > 0 && (
                  <span>
                    {syncing
                      ? 'Syncing…'
                      : `${pendingEntries.length} entr${
                          pendingEntries.length === 1 ? 'y' : 'ies'
                        } waiting to sync`}
                  </span>
                )}
              </div>
            )}

            {displayEntries.length === 0 ? (
              <div className="entries-empty">
                <div className="empty-icon-wrap">
                  <IconEntryLarge />
                </div>

           {normalizedEntrySearch ? (
                  <>
                    <p className="empty-heading">No matching entries</p>
                    <p className="empty-body">
                      No entries match &quot;{entrySearchQuery.trim()}&quot;. Try another search
                      term or clear the search.
                    </p>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setEntrySearchQuery('')}
                    >
                      Clear search
                    </button>
                  </>
                ) : searchActive ? (
                  <>
                    <p className="empty-heading">No entries match your search.</p>
                    <p className="empty-body">
                      Try changing or clearing one or more search filters.
                    </p>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={handleClearStructuredSearch}
                    >
                      Clear search
                    </button>
                  </>
                ) : showArchivedEntries ? (
                  <>
                    <p className="empty-heading">No archived entries.</p>
                    <p className="empty-body">
                      Entries you archive appear here. Unarchive an entry to return it to the main list.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="empty-heading">No entries yet.</p>
                    <p className="empty-body">
                      Add your first entry to start building a record for this project. Each entry
                      captures a piece of your work.
                    </p>
                    {!project.archivedAt && (
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => setShowEntryModal(true)}
                      >
                        <IconPlus />
                        Add New Entry
                      </button>
                    )}
                  </>

                )}
              </div>
            ) : entryView === 'calendar' ? (
              <CalendarView entries={displayEntries} formatLoggedTime={formatLoggedTime} />
            ) : entryView === 'board' ? (
              <BoardView
                entries={displayEntries}
                fields={fields}
                formatLoggedTime={formatLoggedTime}
              />
            ) : (
              <div className="entries-list">
                {displayEntries.map((entry) => {
                  const values = Array.isArray(entry.values) ? entry.values : [];
                  const linkedEntries = Array.isArray(entry.linkedEntries)
                    ? entry.linkedEntries
                    : [];
                  const checklist = Array.isArray(entry.checklist) ? entry.checklist : [];
                  const completedChecklist = checklist.filter((item) => item.completed).length;

                  const isOverdue =
                    entry.dueAt && !entry.completedAt && new Date(entry.dueAt) < new Date();

                  const status = getEntryCardStatus(entry, isOverdue);

                  return (
                    <div
                      className="entry-row entry-row-clickable entry-card"
                      id={`entry-${entry.id}`}
                      key={entry.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => openEntryDetails(entry)}
                      onKeyDown={(event) => {
                        if (event.target !== event.currentTarget) {
                          return;
                        }

                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          openEntryDetails(entry);
                        }
                      }}
                    >
                      <div className="entry-card-top">
                        <div className="entry-card-heading">
                          <span
                            className={`entry-status-dot entry-status-dot--${status.key}`}
                            aria-hidden="true"
                          />

                          <h3 className="entry-row-title">{entry.name || 'Logbook Entry'}</h3>
                        </div>

                        <div className="entry-card-top-meta">
                          <span className={`entry-status-badge badge badge--${status.variant}`}>
                            {status.label}
                          </span>

                          <span className="entry-duration">
                            <IconClockSmall />
                            {formatLoggedTime(entry.durationMinutes)}
                          </span>
                        </div>
                      </div>

                      <p className="entry-card-subline">
                        <span>{formatDate(entry.occurredAt || entry.createdAt)}</span>

                        {entry.dueAt && (
                          <span
                            className={
                              isOverdue ? 'entry-due-date entry-due-overdue' : 'entry-due-date'
                            }
                          >
                            {entry.completedAt
                              ? 'Completed'
                              : isOverdue
                                ? `Overdue — was due ${formatDate(entry.dueAt)}`
                                : `Due ${formatDate(entry.dueAt)}`}
                          </span>
                        )}
                      </p>

                      {values.length > 0 && (
                        <div className="entry-card-preview">
                          <span className="entry-card-preview-label">
                            {values[0].name || 'Field'}
                            {values[0].archived ? ' (removed)' : ''}
                          </span>
                          <span className="entry-card-preview-value">
                            <FormattedFieldValue field={values[0]} />
                          </span>
                        </div>
                      )}

                      {(checklist.length > 0 || linkedEntries.length > 0 || values.length > 1) && (
                        <div className="entry-card-meta">
                          {checklist.length > 0 && (
                            <span>
                              {completedChecklist}/{checklist.length} checklist
                            </span>
                          )}
                          {linkedEntries.length > 0 && (
                            <span>
                              {linkedEntries.length} linked{' '}
                              {linkedEntries.length === 1 ? 'entry' : 'entries'}
                            </span>
                          )}
                          {values.length > 1 && (
                            <span>
                              +{values.length - 1} more{' '}
                              {values.length - 1 === 1 ? 'field' : 'fields'}
                            </span>
                          )}
                        </div>
                      )}

                      {Array.isArray(entry.tags) && entry.tags.length > 0 && (
                        <div className="entry-tags">
                          {entry.tags.map((tag) => (
                            <span className="entry-tag" key={tag}>
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="entry-card-footer">
                        {entry.dueAt && !entry.completedAt && (
                          <button
                            type="button"
                            className="entry-card-action"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleMarkComplete(entry.id);
                            }}
                          >
                            <Check size={13} />
                            Mark as complete
                          </button>
                        )}

                        <span className="entry-row-open-hint">
                          Click entry to view full contents <span aria-hidden="true">→</span>
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </main>

      {selectedEntryForDetails && (
        <EntryDetailsModal
          entry={selectedEntryForDetails}
          archived={Boolean(project.archivedAt)}
          onClose={() => setSelectedEntryForDetails(null)}
          onEdit={() => openEditEntryModal(selectedEntryForDetails)}
          onDelete={handleDeleteEntry}
          onArchive={handleArchiveEntry}
          onUnarchive={handleUnarchiveEntry}
          onHistory={(entry) => {
            setSelectedEntryForDetails(null);
            setSelectedEntryForHistory(entry);
          }}
          deleteSaving={entryDeleteSaving}
          archiveSaving={archiveSaving}
          onChecklistToggle={handleChecklistToggle}
          checklistSaving={checklistSaving}
          onProjectReferenceClick={(projectId) => {
            setSelectedEntryForDetails(null);
            navigate(`/projects/${projectId}`);
          }}
        />
      )}

      {selectedEntryForHistory && (
        <EntryHistoryModal
          projectId={project.id}
          entryId={selectedEntryForHistory.id}
          entryName={selectedEntryForHistory.name}
          onClose={() => setSelectedEntryForHistory(null)}
          onRestored={loadProject}
        />
      )}

      {showEditEntryModal && selectedEntryForEdit && !project.archivedAt && (
        <EditEntryModal
          entry={selectedEntryForEdit}
          fields={fields}
          projects={projects}
          entries={entries}
          onClose={() => {
            setShowEditEntryModal(false);
            setSelectedEntryForEdit(null);
          }}
          onSave={(payload) => handleUpdateEntry(selectedEntryForEdit.id, payload)}
        />
      )}

      {/* Your responsibility: create entries */}
      {showEntryModal && !project.archivedAt && (
        <NewEntryModal
          fields={fields}
          projects={projects}
          entries={entries}
          currentProjectId={project.id}
          onClose={() => setShowEntryModal(false)}
          onCreate={handleCreateEntry}
        />
      )}

      {showProjectReferenceModal && (
        <ReferenceSelectionModal
          title="Project references"
          description="Select the projects that this project should reference."
          options={projects.filter((candidate) => candidate.id !== project.id)}
          selectedIds={
            Array.isArray(details.references)
              ? details.references.map((reference) => reference.referencedProjectId)
              : []
          }
          getOptionId={(option) => option.id}
          getOptionLabel={(option) => option.name || 'Untitled Project'}
          onClose={() => setShowProjectReferenceModal(false)}
          onSave={handleUpdateProjectReferences}
          saving={projectReferenceSaving}
        />
      )}

      {/* Teammate responsibility: project editing */}
      {showEditProjectModal && (
        <EditProjectModal
          project={editableProject}
          onClose={() => setShowEditProjectModal(false)}
          onSave={handleUpdateProject}
        />
      )}

      {showAutomationRulesModal && (
        <AutomationRulesModal
          projectId={id}
          fields={fields}
          onClose={() => setShowAutomationRulesModal(false)}
        />
      )}

      {showSharingModal && (
        <SharingModal
          projectId={id}
          onClose={() => setShowSharingModal(false)}
        />
      )}

      {showRecurringModal && !project.archivedAt && (
        <RecurringEntriesModal
          projectId={project.id}
          onClose={handleCloseRecurringModal}
          onChanged={handleRecurringChanged}
        />
      )}

      <ProjectDetailsStyles />
    </div>
  );
}

function ReferenceSelectionModal({
  title,
  description,
  options,
  selectedIds,
  getOptionId,
  getOptionLabel,
  onClose,
  onSave,
  saving = false,
}) {
  const [selected, setSelected] = useState(Array.isArray(selectedIds) ? selectedIds : []);

  function toggle(id) {
    setSelected((current) =>
      current.includes(id) ? current.filter((currentId) => currentId !== id) : [...current, id],
    );
  }

  return (
    <div
      className="modal-overlay"
      onClick={(event) => {
        if (event.target === event.currentTarget && !saving) {
          onClose();
        }
      }}
    >
      <div
        className="modal reference-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="reference-modal-title"
      >
        <div className="modal-header">
          <div>
            <h2 className="modal-title" id="reference-modal-title">
              {title}
            </h2>
            {description && <p className="reference-modal-description">{description}</p>}
          </div>

          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label="Close"
            disabled={saving}
          >
            <IconXSmall />
          </button>
        </div>

        <div className="modal-body">
          {options.length === 0 ? (
            <div className="references-empty-modal">No other items are available to reference.</div>
          ) : (
            <div className="reference-selection-list">
              {options.map((option) => {
                const optionId = getOptionId(option);
                const checked = selected.includes(optionId);

                return (
                  <label
                    className={`reference-selection-option${
                      checked ? ' reference-selection-option--selected' : ''
                    }`}
                    key={optionId}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(optionId)}
                      disabled={saving}
                    />
                    <span>{getOptionLabel(option)}</span>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button type="button" className="btn-cancel" onClick={onClose} disabled={saving}>
            Cancel
          </button>

          <button
            type="button"
            className="btn-save"
            onClick={() => onSave(selected)}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save references'}
          </button>
        </div>
      </div>
    </div>
  );
}

function FormattedFieldValue({ field }) {
  const value = field.value;

  if (value === null || value === undefined || value === '') {
    return '—';
  }

  if (field.type === 'date') {
    const date = new Date(value);

    if (!Number.isNaN(date.getTime())) {
      return new Intl.DateTimeFormat('en-ZA', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }).format(date);
    }
  }

  return String(value);
}

function getEntryCardStatus(entry, isOverdue) {
  if (entry.completedAt) {
    return { key: 'completed', label: 'Completed', variant: 'success' };
  }

  if (entry.isPending) {
    return entry.syncStatus === 'failed'
      ? { key: 'sync-failed', label: 'Sync failed', variant: 'danger' }
      : { key: 'pending', label: 'Pending sync', variant: 'warning' };
  }

  if (isOverdue) {
    return { key: 'overdue', label: 'Overdue', variant: 'danger' };
  }

  if (entry.dueAt) {
    return { key: 'upcoming', label: 'Upcoming', variant: 'warning' };
  }

  return { key: 'open', label: 'Open', variant: 'neutral' };
}

/* =========================================================
 * SUB COMPONENTS
 * ======================================================= */

function ProjectStat({ label, value, icon }) {
  return (
    <div className="project-stat">
      <div className="project-stat-icon">{icon}</div>

      <div className="project-stat-text">
        <span className="project-stat-label">{label}</span>

        <span className="project-stat-value">{value}</span>
      </div>
    </div>
  );
}

/* =========================================================
 * STYLES
 * ======================================================= */

function ProjectDetailsStyles() {
  return (
    <style>{`
        .entry-search-wrap {
          display: grid;
          grid-template-columns: 190px minmax(0, 1fr);
          gap: 10px;
          margin: 14px 0 8px;
        }

        .entry-search-field {
          min-height: 44px;
          padding: 0 12px;
          border: 1px solid rgba(148, 163, 184, 0.35);
          border-radius: 8px;
          background: #ffffff;
          color: #1e293b;
          font: inherit;
          outline: none;
        }

        .entry-search-field:focus,
        .entry-simple-search:focus-within {
          border-color: #4f63d2;
          box-shadow: 0 0 0 3px rgba(79, 99, 210, 0.1);
        }

        .entry-simple-search {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 0 14px;
          min-height: 44px;
          border: 1px solid rgba(148, 163, 184, 0.35);
          border-radius: 8px;
          background: #ffffff;
        }

        .entry-simple-search-icon {
          color: #94a3b8;
          font-size: 20px;
          line-height: 1;
        }

        .entry-simple-search input {
          flex: 1;
          min-width: 0;
          border: 0;
          outline: 0;
          background: transparent;
          color: #1e293b;
          font: inherit;
        }

        .entry-simple-search input::placeholder {
          color: #94a3b8;
        }

        .entry-simple-search-clear {
          border: 0;
          background: transparent;
          color: #4f63d2;
          font: inherit;
          font-weight: 600;
          cursor: pointer;
        }

        .entry-search-status {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          margin: 0 2px 10px;
          color: #94a3b8;
          font-size: 12px;
        }

        @media (max-width: 720px) {
          .entry-search-wrap {
            grid-template-columns: 1fr;
          }

          .entry-search-status {
            flex-direction: column;
            gap: 4px;
          }
        }

      .app-shell {
        display: flex;
        min-height: 100vh;
        background: #f8fafc;
      }

      .app-main {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        overflow-x: hidden;
      }

      /* Breadcrumb */

      .breadcrumb-bar {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 24px 40px 0;
        font-size: 13px;
        color: #94a3b8;
      }

      .breadcrumb-link {
        background: none;
        border: none;
        cursor: pointer;
        font-family: 'Inter', sans-serif;
        font-size: 13px;
        color: #64748b;
        padding: 0;
        font-weight: 500;
        transition: color 0.15s ease;
      }

      .breadcrumb-link:hover {
        color: #4f63d2;
      }

      .breadcrumb-sep {
        display: flex;
        align-items: center;
        color: #cbd5e1;
      }

      .breadcrumb-current {
        color: #94a3b8;
        font-weight: 400;
      }

      /* Page header */

      .page-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        padding: 20px 40px 0;
        gap: 16px;
        flex-wrap: wrap;
      }

      .page-header-left {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .page-header-eyebrow {
        font-size: 12px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: #94a3b8;
        margin: 0;
      }

      .page-header-title {
        font-family:
          'DM Serif Display',
          Georgia,
          serif;
        font-size: 30px;
        font-weight: 400;
        color: #1a2340;
        margin: 0;
      }

      .page-header-description {
        font-family: 'Inter', sans-serif;
        font-size: 13px;
        color: #64748b;
        line-height: 1.55;
        margin: 4px 0 0;
        max-width: 620px;
      }

      .page-header-actions {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
        padding-top: 8px;
      }

      .header-action-divider {
        width: 1px;
        height: 20px;
        background: var(--border, #d6dbe4);
        margin: 0 4px;
        flex-shrink: 0;
      }

      .btn-ghost-archive {
        color: var(--text-muted, #5b6b83);
      }
      .btn-ghost-archive:hover:not(:disabled) {
        background: var(--danger-soft, #fceded);
        color: var(--danger, #dc4444);
      }

      /* Buttons: base .btn system now lives in index.css (design tokens) */

      /* Content */

      .project-content {
        padding: 24px 40px 40px;
        display: flex;
        flex-direction: column;
        gap: 24px;
      }

      /* Stats */

      .project-stat-strip {
        background: #ffffff;
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        display: flex;
        align-items: stretch;
        overflow: hidden;
      }

      .project-stat {
        flex: 1;
        display: flex;
        align-items: center;
        gap: 14px;
        padding: 20px 24px;
      }

      .project-stat-icon {
        width: 36px;
        height: 36px;
        border-radius: 9px;
        background: #f1f5f9;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #64748b;
        flex-shrink: 0;
      }

      .project-stat-text {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }

      .project-stat-label {
        font-size: 11px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: #94a3b8;
      }

      .project-stat-value {
        font-family: 'Inter', sans-serif;
        font-size: 20px;
        font-weight: 600;
        font-variant-numeric: tabular-nums;
        color: #1a2340;
        line-height: 1.1;
      }

      .stat-divider {
        width: 1px;
        background: #f1f5f9;
        margin: 12px 0;
      }

      /* Entries */

      .entries-section {
        background: #ffffff;
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        overflow: hidden;
      }

      .entries-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 18px 24px;
        border-bottom: 1px solid #f1f5f9;
      }

      .entries-title {
        font-family: 'Inter', sans-serif;
        font-size: 14px;
        font-weight: 600;
        color: #1a2340;
        margin: 0;
      }

      .entries-count {
        font-size: 12px;
        font-weight: 500;
        color: #94a3b8;
      }

      .entries-empty {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        padding: 64px 32px;
        gap: 10px;
      }

      .empty-icon-wrap {
        width: 56px;
        height: 56px;
        border-radius: 14px;
        background: #f1f5f9;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #94a3b8;
        margin-bottom: 4px;
      }

      .empty-heading {
        font-size: 15px;
        font-weight: 600;
        color: #1a2340;
        margin: 0;
      }

      .empty-body {
        font-size: 13px;
        color: #94a3b8;
        margin: 0 0 6px;
        max-width: 360px;
        line-height: 1.6;
      }

      .entries-list {
        display: flex;
        flex-direction: column;
      }

      .entry-row {
        padding: 16px 24px;
        border-bottom: 1px solid #f1f5f9;
        transition: background 0.15s ease;
      }

      .entry-row:last-child {
        border-bottom: none;
      }

      .entry-row:hover {
        background: #fbfcfe;
      }

      .entry-card-top {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }

      .entry-card-heading {
        display: flex;
        align-items: center;
        gap: 9px;
        min-width: 0;
      }

      .entry-status-dot {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: #cbd5e1;
        flex-shrink: 0;
      }
      .entry-status-dot--completed { background: var(--success-text, #166534); }
      .entry-status-dot--pending,
      .entry-status-dot--upcoming { background: var(--warning-text, #d97706); }
      .entry-status-dot--overdue,
      .entry-status-dot--sync-failed { background: var(--danger, #dc2626); }

      .entry-card-top-meta {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-shrink: 0;
      }

      .entry-row-title {
        font-family: 'Inter', sans-serif;
        font-size: 14px;
        font-weight: 600;
        color: #1a2340;
        margin: 0;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .entry-card-subline {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        column-gap: 8px;
        margin: 5px 0 0;
        font-family: 'Inter', sans-serif;
        font-size: 12px;
        color: #94a3b8;
      }

      .entry-card-subline > span + span::before {
        content: '·';
        margin-right: 8px;
        color: #cbd5e1;
      }

      .entry-due-date {
        font-weight: 600;
        color: #64748b;
      }

      .entry-due-overdue {
        color: var(--danger, #dc2626);
      }

      .entry-duration {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        padding: 5px 9px;
        border-radius: 6px;
        background: var(--surface-subtle, #f1f5f9);
        color: var(--text-muted, #64748b);
        font-family: 'Inter', sans-serif;
        font-size: 12px;
        font-weight: 500;
        white-space: nowrap;
      }

      .entry-tags {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-top: 9px;
      }

      .entry-tag {
        display: inline-flex;
        align-items: center;
        padding: 3px 9px;
        border-radius: 999px;
        background: var(--accent-soft, #eef2ff);
        color: var(--accent-text, #4338ca);
        font-family: 'Inter', sans-serif;
        font-size: 11px;
        font-weight: 500;
        white-space: nowrap;
      }

      .offline-banner {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 14px;
        margin-bottom: 12px;
        border-radius: 8px;
        background: #fffbeb;
        border: 1px solid #fde68a;
        color: #92400e;
        font-family: 'Inter', sans-serif;
        font-size: 13px;
      }

      .entry-values {
        display: grid;
        grid-template-columns:
          repeat(
            auto-fit,
            minmax(190px, 1fr)
          );
        gap: 12px;
        margin-top: 16px;
      }

      .entry-value {
        display: flex;
        flex-direction: column;
        gap: 4px;
        padding: 11px 12px;
        background: #f8fafc;
        border: 1px solid #f1f5f9;
        border-radius: 8px;
      }

      .entry-value-name {
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        font-weight: 600;
        color: #94a3b8;
      }

      .entry-value-content {
        font-size: 13px;
        line-height: 1.5;
        color: #334155;
        overflow-wrap: anywhere;
      }

      /* Status / errors */

      .project-inline-error {
        padding: 11px 14px;
        border: 1px solid #fecaca;
        border-radius: 8px;
        background: #fef2f2;
        color: #b91c1c;
        font-family: 'Inter', sans-serif;
        font-size: 13px;
      }

      .project-inline-notice {
        padding: 11px 14px;
        border: 1px solid #c7d2fe;
        border-radius: 8px;
        background: #eef2ff;
        color: #3b4ba8;
        font-family: 'Inter', sans-serif;
        font-size: 13px;
      }

      .project-status {
        flex: 1;
        min-height: 420px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 12px;
        padding: 40px;
        text-align: center;
        color: #64748b;
      }

      .project-status h2 {
        font-family: 'Inter', sans-serif;
        font-size: 18px;
        font-weight: 600;
        color: #1a2340;
        margin: 0;
      }

      .project-status p {
        margin: 0;
        font-size: 13px;
      }

      /* Modal shell: .modal-overlay/.modal/.modal-header/.modal-title/.modal-close/.modal-form/.modal-body now live in index.css */

      /* Form base: .form-field/.form-label/.form-input/.form-select now live in index.css */

      .form-label-required::after {
        content: ' *';
        color: #ef4444;
      }

      .required {
        color: #ef4444;
      }

      .fields-block {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .fields-section-label {
        font-size: 12px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.07em;
        color: #94a3b8;
        margin: 0;
      }

      .fields-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .new-field-card {
        display: flex;
        flex-direction: column;
      }

      .field-row {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 12px;
        background: #f8fafc;
        border: 1.5px solid #e2e8f0;
        border-radius: 8px;
      }

      .field-row-drag {
        color: #cbd5e1;
        display: flex;
        flex-shrink: 0;
      }

      .field-row-name {
        flex: 1;
        font-size: 13px;
        font-weight: 500;
        color: #1e293b;
        min-width: 0;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .field-row-type {
        font-size: 11px;
        font-weight: 500;
        color: #94a3b8;
        background: #e2e8f0;
        border-radius: 4px;
        padding: 2px 7px;
        flex-shrink: 0;
      }

      .field-row-remove {
        background: none;
        border: none;
        cursor: pointer;
        color: #cbd5e1;
        display: flex;
        align-items: center;
        padding: 2px;
        border-radius: 4px;
        transition:
          color 0.15s ease,
          background 0.15s ease;
        flex-shrink: 0;
      }

      .field-row-remove:hover {
        color: #ef4444;
        background:
          rgba(239,68,68,0.06);
      }

      .new-field-value {
        padding: 8px 0 4px;
      }

      .add-field-row {
        display: flex;
        gap: 8px;
        align-items: flex-end;
      }

      .add-field-name {
        flex: 1;
      }

      .add-field-type {
        width: 140px;
        flex-shrink: 0;
      }

      /* .btn-add-field/.form-error/.modal-footer/.btn-cancel/.btn-save now live in index.css */

      /* Responsive */


      .entries-header-with-views {
        gap: 18px;
        flex-wrap: wrap;
      }

      .structured-search {
        padding: 18px 24px;
        border-bottom: 1px solid #f1f5f9;
        background: var(--surface-subtle, #f8fafc);
      }

      .structured-search-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 16px;
        margin-bottom: 16px;
      }

      .structured-search-title {
        margin: 0;
        color: var(--text-strong, #1a2340);
        font-size: 14px;
        font-weight: 600;
      }

      .structured-search-description {
        margin: 4px 0 0;
        color: var(--text-muted, #64748b);
        font-size: 12px;
        line-height: 1.5;
      }

      .search-result-count {
        flex-shrink: 0;
        padding: 5px 9px;
        border-radius: 999px;
        background: var(--accent-soft, #eef2ff);
        color: var(--accent-text, #3949ab);
        font-size: 11px;
        font-weight: 600;
      }

      .structured-search-grid {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 12px;
      }

      .search-field-wide {
        grid-column: span 2;
      }

      .custom-search-filters {
        display: grid;
        gap: 8px;
        margin-top: 14px;
        padding-top: 14px;
        border-top: 1px solid #f1f5f9;
      }

      .custom-search-filter-row {
        display: grid;
        grid-template-columns: minmax(160px, 0.8fr) minmax(180px, 1fr) auto;
        align-items: center;
        gap: 8px;
      }

      .structured-search-actions {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin-top: 16px;
      }

      .structured-search-actions .btn-add-field {
        width: auto;
      }

      .structured-search-actions-right {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .structured-search-error {
        margin-top: 12px;
        padding: 9px 11px;
        border-radius: 8px;
        background: #fff1f2;
        color: #be123c;
        font-size: 12px;
      }

      .saved-filters-bar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        flex-wrap: wrap;
        padding: 10px 24px;
        border-bottom: 1px solid var(--border, #f1f5f9);
        background: var(--surface, #ffffff);
      }

      .saved-filters-group {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
        min-width: 0;
      }

      .saved-filters-select {
        width: auto;
        min-width: 160px;
      }

      .saved-filters-status {
        display: inline-flex;
        gap: 2px;
        padding: 3px;
        border: 1px solid var(--border, #e2e8f0);
        border-radius: 999px;
        background: var(--surface-subtle, #f8fafc);
      }

      .status-toggle {
        border: 0;
        border-radius: 999px;
        padding: 4px 12px;
        background: transparent;
        color: var(--text-muted, #64748b);
        font: inherit;
        font-size: 12px;
        font-weight: 500;
        cursor: pointer;
      }

      .status-toggle:hover:not(.status-toggle--active) {
        color: var(--text-strong, #1a2340);
      }

      .status-toggle--active,
      .status-toggle[aria-pressed='true'] {
        background: var(--surface, #ffffff);
        color: var(--text-strong, #1a2340);
        box-shadow: var(--shadow-sm, 0 1px 3px rgba(15, 23, 42, 0.12));
      }

      .status-toggle--overdue.status-toggle--active,
      .status-toggle--overdue[aria-pressed='true'] {
        background: var(--danger-soft, #fef2f2);
        color: var(--danger-text, #b91c1c);
        box-shadow: none;
      }

      .calendar-toolbar,
      .board-toolbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin: 14px 0;
      }

      .calendar-grid {
        display: grid;
        grid-template-columns: repeat(7, minmax(0, 1fr));
        border-left: 1px solid var(--border, #e2e8f0);
        border-top: 1px solid var(--border, #e2e8f0);
        border-top-right-radius: var(--radius-md, 8px);
      }

      .calendar-weekdays {
        border: 0;
      }

      .calendar-weekdays > div {
        padding: 8px;
        text-align: center;
        font-size: 11px;
        font-weight: 700;
        color: var(--text-muted, #64748b);
      }

      .calendar-cell {
        min-height: 112px;
        padding: 8px;
        border-right: 1px solid var(--border, #e2e8f0);
        border-bottom: 1px solid var(--border, #e2e8f0);
        background: var(--surface, #fff);
      }

      .calendar-cell-empty { background: var(--surface-subtle, #f8fafc); }
      .calendar-month-label { color: var(--text-strong, #1a2340); font-size: 14px; font-weight: 600; }
      .calendar-day-number { display: inline-flex; align-items: center; justify-content: center; min-width: 20px; height: 20px; padding: 0 4px; font-size: 11px; font-weight: 700; color: var(--text-muted, #475569); margin-bottom: 6px; border-radius: 999px; }
      .calendar-cell-today .calendar-day-number { background: var(--accent, #4f63d2); color: #ffffff; }
      .calendar-cell-overdue .calendar-day-number { background: var(--danger-soft, #fef2f2); color: var(--danger-text, #b91c1c); }
      .calendar-entry { display: grid; gap: 2px; margin-bottom: 6px; padding: 6px; border-radius: var(--radius-sm, 7px); background: var(--accent-soft, #eef2ff); font-size: 10px; color: var(--text, #334155); }
      .calendar-entry strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .calendar-entry span, .calendar-entry small { color: var(--text-muted, #64748b); }

      .board-toolbar { justify-content: flex-start; }
      .board-toolbar label { font-size: 12px; font-weight: 600; color: var(--text-muted, #475569); }
      .board-select { padding: 8px 10px; border: 1px solid var(--border, #cbd5e1); border-radius: var(--radius-md, 8px); background: var(--surface, #fff); color: var(--text, #334155); font: inherit; font-size: 13px; }
      .board-columns { display: flex; gap: 14px; overflow-x: auto; padding: 4px 0 12px; }
      .board-column { flex: 0 0 260px; padding: 10px; border-radius: var(--radius-lg, 12px); background: var(--surface-subtle, #f1f5f9); }
      .board-column-header { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 10px; color: var(--text-strong, #334155); font-size: 12px; font-weight: 600; }
      .board-column-header span { padding: 1px 8px; border-radius: 999px; background: var(--surface, #fff); color: var(--text-muted, #64748b); font-size: 11px; font-weight: 600; box-shadow: var(--shadow-sm, 0 1px 2px rgba(15, 23, 42, 0.08)); }
      .board-card { display: grid; gap: 5px; padding: 10px; margin-bottom: 8px; border: 1px solid var(--border, #e2e8f0); border-radius: var(--radius-md, 8px); background: var(--surface, #fff); font-size: 12px; box-shadow: var(--shadow-sm, 0 1px 2px rgba(15, 23, 42, 0.06)); transition: border-color 120ms ease, box-shadow 120ms ease; }
      .board-card:hover { border-color: var(--accent-border, #c7d2fe); box-shadow: var(--shadow-md, 0 2px 6px rgba(15, 23, 42, 0.1)); }
      .board-card span, .board-card small { color: var(--text-muted, #64748b); }
      .view-empty { padding: 28px; text-align: center; color: var(--text-muted, #64748b); border: 1px dashed var(--border-strong, #cbd5e1); border-radius: var(--radius-lg, 12px); background: var(--surface-subtle, #f8fafc); font-size: 13px; }

      @media (max-width: 900px) {
        .structured-search-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .breadcrumb-bar,
        .page-header,
        .project-content {
          padding-left: 24px;
          padding-right: 24px;
        }

        .project-stat-strip {
          flex-wrap: wrap;
        }

        .project-stat {
          min-width: 50%;
        }

        .stat-divider {
          display: none;
        }
      }

      @media (max-width: 600px) {
        .page-header {
          flex-direction: column;
          align-items: flex-start;
        }

        .calendar-cell {
          min-height: 72px;
          padding: 4px;
        }

        .calendar-day-number {
          font-size: 11px;
        }

        .board-column {
          flex-basis: 232px;
        }

        .page-header-actions {
          padding-top: 0;
        }

        .page-header-title {
          font-size: 24px;
        }

        .project-stat {
          min-width: 100%;
        }

        .add-field-row {
          flex-wrap: wrap;
        }

        .edit-entry-reference-grid {
          grid-template-columns: 1fr;
        }

        .edit-entry-new-field-grid {
          grid-template-columns: 1fr;
        }

        .add-field-type {
          width: 100%;
        }

        .btn-add-field {
          width: 100%;
        }

        .saved-filters-group {
          width: 100%;
        }

        .saved-filters-select {
          flex: 1;
          min-width: 0;
        }

        .saved-filters-status {
          margin-left: auto;
        }
      }
      .entry-feature-block {
        margin-top: 14px;
        padding-top: 14px;
        border-top: 1px solid #f1f5f9;
      }

      .entry-feature-heading {
        display: flex;
        align-items: center;
        gap: 7px;
        margin-bottom: 8px;
        color: #64748b;
        font-size: 12px;
        font-weight: 600;
      }

      .entry-checklist {
        display: flex;
        flex-direction: column;
        gap: 7px;
      }

      .entry-checklist-item {
        display: flex;
        align-items: center;
        gap: 9px;
        color: #334155;
        font-size: 13px;
        cursor: pointer;
      }

      .entry-checklist-item input {
        width: 15px;
        height: 15px;
        accent-color: #4f63d2;
      }

      .entry-checklist-item--done span {
        color: #94a3b8;
        text-decoration: line-through;
      }

      .entry-checklist-row {
        display: flex;
        align-items: center;
        gap: 9px;
        color: #334155;
        font-size: 13px;
        min-width: 0;
      }

      .entry-checklist-row > span {
        flex: 1;
        min-width: 0;
      }

      .entry-checklist-edit-input {
        flex: 1;
        min-width: 0;
        border: 1px solid #cbd5e1;
        border-radius: 6px;
        padding: 5px 7px;
        font: 400 12px 'Inter', sans-serif;
      }

      .entry-checklist-actions {
        display: flex;
        gap: 5px;
        margin-left: auto;
      }

      .entry-checklist-action {
        border: 0;
        background: transparent;
        color: #4f63d2;
        font: 500 11px 'Inter', sans-serif;
        cursor: pointer;
        padding: 2px 3px;
      }

      .entry-checklist-delete {
        color: #b91c1c;
      }

      .entry-reference-list {
        display: flex;
        flex-wrap: wrap;
        gap: 7px;
      }

      .entry-reference-link {
        border: 1px solid #e2e8f0;
        background: #f8fafc;
        color: #4f63d2;
        border-radius: 7px;
        padding: 6px 9px;
        font: 500 12px 'Inter', sans-serif;
        cursor: pointer;
      }

      .entry-reference-link:hover {
        background: #eef2ff;
        border-color: #c7d2fe;
      }
      .edit-entry-add-field {
        white-space: nowrap;
      }

      .edit-entry-new-field-grid {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 160px;
        gap: 8px;
        margin-bottom: 8px;
      }

      .edit-entry-reference-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 14px;
        margin-top: 18px;
      }

      .edit-entry-reference-section {
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 12px;
      }

      .edit-entry-section-heading {
        color: #334155;
        font-size: 13px;
        font-weight: 600;
        margin-bottom: 3px;
      }

      .edit-entry-reference-options {
        display: flex;
        flex-direction: column;
        gap: 7px;
        max-height: 150px;
        overflow: auto;
        margin-top: 10px;
      }

      .edit-entry-check-option {
        display: flex;
        align-items: center;
        gap: 8px;
        color: #334155;
        font-size: 12px;
        cursor: pointer;
      }

      .edit-entry-check-option input {
        accent-color: #4f63d2;
      }

      .edit-entry-muted {
        color: #94a3b8;
        font-size: 12px;
      }

      .edit-entry-note {
        display: flex;
        align-items: center;
        gap: 6px;
        margin-top: 14px;
        color: #64748b;
        font-size: 11px;
      }

      .references-section {
        margin-top: 28px;
        margin-bottom: 28px;
        padding: 20px;
        background: #ffffff;
        border: 1px solid #e2e8f0;
        border-radius: 12px;
      }

      .references-section-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 16px;
        margin-bottom: 14px;
      }

      .references-description {
        margin: 4px 0 0;
        color: #94a3b8;
        font-size: 12px;
      }

      .references-empty {
        margin: 0;
        padding: 16px 18px;
        background: var(--surface-subtle, #f4f6f9);
        border: 1px dashed var(--border, #d6dbe4);
        border-radius: var(--radius-md, 8px);
      }
      .references-empty-title {
        margin: 0 0 3px;
        font-size: 13px;
        font-weight: 500;
        color: var(--text-muted, #5b6b83);
      }
      .references-empty-hint {
        margin: 0;
        font-size: 12px;
        color: var(--text-faint, #8494ab);
      }

      .project-reference-list {
        margin-top: 4px;
      }

      .entry-reference-manage {
        margin-top: 10px;
      }

      .entry-reference-manage-button {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        border: none;
        background: transparent;
        color: #64748b;
        padding: 0;
        font: 500 12px 'Inter', sans-serif;
        cursor: pointer;
      }

      .entry-reference-manage-button:hover {
        color: #4f63d2;
      }

      .entry-reference-manage-button:disabled {
        opacity: 0.55;
        cursor: not-allowed;
      }

      .reference-modal {
        max-width: 520px;
      }

      .reference-modal-description {
        margin: 5px 0 0;
        color: #94a3b8;
        font-size: 12px;
        line-height: 1.5;
      }

      .reference-selection-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
        max-height: 360px;
        overflow-y: auto;
      }

      .reference-selection-option {
        display: flex;
        align-items: center;
        gap: 10px;
        min-height: 42px;
        padding: 9px 11px;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        color: #334155;
        background: #ffffff;
        font-size: 13px;
        cursor: pointer;
      }

      .reference-selection-option:hover {
        background: #f8fafc;
        border-color: #cbd5e1;
      }

      .reference-selection-option--selected {
        background: #f8faff;
        border-color: #c7d2fe;
      }

      .reference-selection-option input {
        width: 15px;
        height: 15px;
        accent-color: #4f63d2;
      }

      .references-empty-modal {
        padding: 28px 12px;
        text-align: center;
        color: #94a3b8;
        font-size: 13px;
      }

      .entry-row-clickable {
        width: 100%;
        text-align: left;
        cursor: pointer;
      }

      .entry-row-clickable:focus-visible {
        outline: 2px solid #4f63d2;
        outline-offset: -2px;
      }

      .entry-card-preview {
        display: flex;
        flex-direction: column;
        gap: 3px;
        min-width: 0;
        margin-top: 10px;
        padding: 9px 12px;
        background: var(--surface-subtle, #f4f6f9);
        border-radius: var(--radius-sm, 6px);
      }

      .entry-card-preview-label {
        font-size: 10px;
        font-weight: 600;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        color: var(--text-faint, #94a3b8);
      }

      .entry-card-preview-value {
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
        font-size: 13px;
        line-height: 1.5;
        color: var(--text, #334155);
        overflow-wrap: anywhere;
      }

      .entry-card-meta {
        display: flex;
        flex-wrap: wrap;
        column-gap: 14px;
        row-gap: 3px;
        margin-top: 9px;
        font-family: 'Inter', sans-serif;
        font-size: 12px;
        color: var(--text-faint, #8494ab);
      }

      .entry-card-footer {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-top: 12px;
      }

      .entry-card-action {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        padding: 4px 10px;
        border-radius: var(--radius-sm, 6px);
        border: 1px solid var(--border, #d6dbe4);
        background: var(--surface, #ffffff);
        color: var(--text-muted, #5b6b83);
        font-family: 'Inter', sans-serif;
        font-size: 12px;
        font-weight: 500;
        cursor: pointer;
        transition:
          background 0.15s ease,
          border-color 0.15s ease,
          color 0.15s ease;
      }
      .entry-card-action:hover {
        background: var(--success-soft, #f0fdf4);
        border-color: var(--success-border, #bbf7d0);
        color: var(--success-text, #166534);
      }
      .entry-card-action:focus-visible {
        outline: 2px solid var(--accent, #4f63d2);
        outline-offset: 2px;
      }

      .entry-row-open-hint {
        margin-left: auto;
        color: var(--accent, #4f63d2);
        font-size: 12px;
        font-weight: 600;
      }

      .entry-row-clickable:hover .entry-row-open-hint {
        text-decoration: underline;
      }

      .entry-details-modal {
        max-width: 720px;
      }

      .entry-details-body {
        overflow-y: auto;
      }

      .entry-details-eyebrow {
        margin: 0 0 4px;
        color: #94a3b8;
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      .entry-details-meta-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 10px;
        margin-bottom: 20px;
      }

      .entry-details-meta-card {
        display: flex;
        align-items: flex-start;
        gap: 9px;
        padding: 12px;
        border: 1px solid #e2e8f0;
        border-radius: 10px;
        background: #f8fafc;
        color: #64748b;
        font-size: 12px;
      }

      .entry-details-meta-card span {
        display: flex;
        flex-direction: column;
        gap: 3px;
        min-width: 0;
      }

      .entry-details-meta-card strong {
        color: #1a2340;
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.04em;
      }

      .entry-details-section {
        padding: 17px 0;
        border-top: 1px solid #f1f5f9;
      }

      .entry-details-section:first-of-type {
        border-top: none;
        padding-top: 0;
      }

      .entry-details-section-heading {
        display: flex;
        align-items: center;
        gap: 7px;
        margin-bottom: 11px;
        color: #1a2340;
        font-size: 13px;
        font-weight: 700;
      }

      .entry-details-fields {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 9px;
      }

      .entry-details-field {
        display: flex;
        flex-direction: column;
        gap: 5px;
        padding: 11px 12px;
        border: 1px solid #e2e8f0;
        border-radius: 9px;
        background: #f8fafc;
      }

      .entry-details-field span,
      .entry-details-reference-label {
        color: #94a3b8;
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.06em;
        text-transform: uppercase;
      }

      .entry-details-field strong {
        color: #334155;
        font-size: 13px;
        line-height: 1.5;
        overflow-wrap: anywhere;
      }

      .entry-details-checklist {
        display: flex;
        flex-direction: column;
        gap: 7px;
      }

      .entry-details-checklist-item {
        display: flex;
        align-items: center;
        gap: 9px;
        padding: 9px 10px;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        color: #334155;
        font-size: 13px;
      }

      .entry-details-checklist-item.is-complete {
        color: #94a3b8;
        text-decoration: line-through;
      }

      .entry-details-checkmark {
        width: 18px;
        flex: 0 0 18px;
        color: #4f63d2;
        font-weight: 700;
      }

      .entry-details-reference-group {
        display: flex;
        flex-direction: column;
        gap: 7px;
        margin-top: 12px;
      }

      .entry-details-reference-list {
        display: flex;
        flex-wrap: wrap;
        gap: 7px;
      }

      .entry-details-empty {
        margin: 0;
        color: #94a3b8;
        font-size: 12px;
      }

      .edit-entry-basic-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
      }

      .checklist-edit-checkbox {
        width: 16px;
        height: 16px;
        flex: 0 0 16px;
        accent-color: #4f63d2;
      }

      .person4-list-row {
        align-items: center;
      }

      .person4-list-row .form-input {
        min-width: 0;
      }

      .person4-list-row-locked {
        background: #f8fafc;
      }

      @media (max-width: 700px) {
        .entry-details-meta-grid,
        .edit-entry-basic-grid {
          grid-template-columns: 1fr;
        }
      }


      .structured-search-main-row { display: flex; gap: 12px; align-items: center; }
      .structured-search-main-input { flex: 1; min-width: 0; }

      .search-more-filters-toggle {
        margin-top: 12px;
        border: 0;
        background: transparent;
        padding: 4px 0;
        color: var(--text-muted, #334155);
        font: inherit;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        border-radius: var(--radius-sm, 6px);
      }

      .search-more-filters-toggle:hover {
        color: var(--accent-text, #1d4ed8);
        text-decoration: underline;
        text-underline-offset: 3px;
      }

      .search-more-filters-toggle:focus-visible {
        outline: 2px solid var(--ring, #4f63d2);
        outline-offset: 2px;
      }

      .search-more-filters-panel { margin-top: 14px; padding-top: 14px; border-top: 1px solid var(--border, #e2e8f0); }
      .search-more-filters-panel .form-label, .specific-field-filters .form-label { color: var(--text-strong, #1e293b) !important; font-weight: 700 !important; opacity: 1 !important; }
      .specific-field-filters { margin-top: 18px; padding-top: 16px; border-top: 1px solid var(--border, #e2e8f0); }
      .specific-field-filter-heading { display: block; margin-bottom: 12px; }
      .specific-field-filter-help { margin: 4px 0 0; color: var(--text-muted, #475569) !important; font-size: 12px; line-height: 1.45; opacity: 1 !important; }
      .specific-field-filter-empty { margin: 8px 0 0; color: var(--text-faint, #64748b); font-size: 12px; }
      .specific-field-filters .btn-add-field:not(:disabled) { color: var(--text, #334155); border-color: var(--border-strong, #94a3b8); background: var(--surface, #fff); }
      .custom-field-add-button { margin-top: 10px; }
      .specific-field-filters .btn-add-field:disabled { color: var(--text-faint, #94a3b8); border-color: var(--border, #cbd5e1); background: var(--surface-subtle, #f8fafc); cursor: not-allowed; opacity: 1; }
      .structured-search-clear-row { display: flex; justify-content: flex-end; margin-top: 12px; }
      @media (max-width: 720px) { .structured-search-main-row { flex-direction: column; align-items: stretch; } }
    `}</style>
  );
}

/* =========================================================
 * ICONS
 * ======================================================= */

function IconLink() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

function CheckSquare({ size = 16 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="m8 12 2.5 2.5L16 9" />
    </svg>
  );
}

function IconChevronRight() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

function IconPlus({ size = 16 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="12" y1="5" x2="12" y2="19" />

      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function IconEdit() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />

      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function IconRepeat() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="17 1 21 5 17 9" />

      <path d="M3 11V9a4 4 0 0 1 4-4h14" />

      <polyline points="7 23 3 19 7 15" />

      <path d="M21 13v2a4 4 0 0 1-4 4H3" />
    </svg>
  );
}

function IconArchive() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="21 8 21 21 3 21 3 8" />

      <rect x="1" y="3" width="22" height="5" />

      <line x1="10" y1="12" x2="14" y2="12" />
    </svg>
  );
}

function IconEntry() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />

      <polyline points="14 2 14 8 20 8" />

      <line x1="9" y1="13" x2="15" y2="13" />

      <line x1="9" y1="17" x2="13" y2="17" />
    </svg>
  );
}

function IconEntryLarge() {
  return (
    <svg
      width="26"
      height="26"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />

      <polyline points="14 2 14 8 20 8" />

      <line x1="9" y1="13" x2="15" y2="13" />

      <line x1="9" y1="17" x2="13" y2="17" />
    </svg>
  );
}

function IconClock() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />

      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function IconClockSmall() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />

      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function IconCalendar() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="4" width="18" height="18" rx="2" />

      <line x1="16" y1="2" x2="16" y2="6" />

      <line x1="8" y1="2" x2="8" y2="6" />

      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function IconInfo() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />

      <line x1="12" y1="8" x2="12" y2="12" />

      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

function IconXSmall() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="18" y1="6" x2="6" y2="18" />

      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function IconGrip() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="9" cy="6" r="1" fill="currentColor" />

      <circle cx="15" cy="6" r="1" fill="currentColor" />

      <circle cx="9" cy="12" r="1" fill="currentColor" />

      <circle cx="15" cy="12" r="1" fill="currentColor" />

      <circle cx="9" cy="18" r="1" fill="currentColor" />

      <circle cx="15" cy="18" r="1" fill="currentColor" />
    </svg>
  );
}
