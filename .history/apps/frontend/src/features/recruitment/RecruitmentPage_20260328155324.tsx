import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { BriefcaseBusiness, CalendarClock, CircleDashed, Plus, Users } from 'lucide-react';
import { createEmployee, CreateEmployeePayload, getAdminCatalogs, getRecruitmentCandidates, RecruitmentCandidate } from '../../app/api';
import { useActor } from '../../app/actor-context';
import { NotificationToast } from '../../components/NotificationToast';

type RecruitmentView = 'positions' | 'candidates' | 'pipeline' | 'interview' | 'interview-history';
type CandidateStage = RecruitmentCandidate['stage'];
type CandidateSource = RecruitmentCandidate['source'];
type InterviewOutcome = 'passed' | 'failed' | 'cancelled';

const ROLE_OPTIONS: CreateEmployeePayload['role'][] = ['employee', 'team_lead', 'manager', 'hr', 'admin'];
const ADMIN_CATALOGS_STORAGE_KEY = 'hrm_admin_catalogs_v2';

type AdminCatalogs = {
  'job-title': string[];
  departments: string[];
  'employee-status': string[];
  'job-categories': string[];
};

type HireEmployeeFormState = {
  fullName: string;
  email: string;
  password: string;
  role: CreateEmployeePayload['role'];
  gender: string;
  dateOfBirth: string;
  address: string;
  startDate: string;
  nationalId: string;
  employeeStatus: string;
  jobCategory: string;
  jobTitle: string;
  degree: string;
  departmentId: string;
  teamId: string;
  photoDataUrl: string;
  otherDegreesFiles: File[];
  languageCertificatesFiles: File[];
};

const DEFAULT_HIRE_FORM: HireEmployeeFormState = {
  fullName: '',
  email: '',
  password: '',
  role: 'employee',
  gender: '',
  dateOfBirth: '',
  address: '',
  startDate: '',
  nationalId: '',
  employeeStatus: '',
  jobCategory: '',
  jobTitle: '',
  degree: '',
  departmentId: '',
  teamId: '',
  photoDataUrl: '',
  otherDegreesFiles: [],
  languageCertificatesFiles: [],
};

function getDefaultAdminCatalogs(): AdminCatalogs {
  return {
    'job-title': ['Kỹ sư phần mềm', 'Trưởng nhóm', 'Chuyên viên nhân sự', 'Chuyên viên tuyển dụng'],
    departments: ['Kỹ thuật', 'Nhân sự', 'Kinh doanh', 'Tài chính'],
    'employee-status': ['Toàn thời gian', 'Bán thời gian', 'Tự do', 'Thực tập sinh', 'Cộng tác viên'],
    'job-categories': ['Kỹ thuật', 'Nhân sự', 'Bán hàng', 'Tài chính', 'Vận hành'],
  };
}

function loadAdminCatalogs(): AdminCatalogs {
  const defaults = getDefaultAdminCatalogs();
  try {
    const raw = localStorage.getItem(ADMIN_CATALOGS_STORAGE_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<AdminCatalogs>;
    return {
      'job-title': Array.isArray(parsed['job-title']) ? parsed['job-title'] : defaults['job-title'],
      departments: Array.isArray(parsed.departments) ? parsed.departments : defaults.departments,
      'employee-status': Array.isArray(parsed['employee-status']) ? parsed['employee-status'] : defaults['employee-status'],
      'job-categories': Array.isArray(parsed['job-categories']) ? parsed['job-categories'] : defaults['job-categories'],
    };
  } catch {
    return defaults;
  }
}

interface PositionItem {
  id: string;
  title: string;
  department: string;
  openings: number;
  status: 'open' | 'paused' | 'closed';
  deadline?: string;
}

interface InterviewItem {
  id: string;
  candidateId: string;
  candidateName: string;
  position: string;
  interviewer: string;
  scheduledAt: string;
  mode: 'online' | 'offline';
  status: 'scheduled' | 'done' | 'cancelled';
  outcome?: InterviewOutcome;
  notes?: string;
  evaluatedById?: string;
  evaluatedByName?: string;
  evaluatedByRole?: string;
  evaluatedAt?: string;
}

interface StageReviewEntry {
  from: CandidateStage;
  to: CandidateStage;
  comment: string;
  createdAt: string;
  decidedById?: string;
  decidedByName?: string;
  decidedByRole?: string;
}

type CandidateRecord = RecruitmentCandidate & {
  avatarUrl?: string;
  cvFileName?: string;
  cvFileUrl?: string;
  stageReviews?: StageReviewEntry[];
};

interface RecruitmentStore {
  positions: PositionItem[];
  candidates: CandidateRecord[];
  interviews: InterviewItem[];
}

const RECRUITMENT_STORAGE_KEY = 'hrm_recruitment_v2';

const stageOrder: CandidateStage[] = ['new', 'screening', 'interview', 'offer', 'hired'];

function parseRecruitmentView(view: string | null): RecruitmentView {
  if (view === 'positions' || view === 'candidates' || view === 'pipeline' || view === 'interview' || view === 'interview-history') {
    return view;
  }
  return 'positions';
}

function buildDefaultStore(): RecruitmentStore {
  const now = new Date();
  return {
    positions: [
      { id: 'POS-001', title: 'Frontend Engineer', department: 'Technology', openings: 2, status: 'open', deadline: now.toISOString().slice(0, 10) },
      { id: 'POS-002', title: 'QA Engineer', department: 'Technology', openings: 1, status: 'open', deadline: now.toISOString().slice(0, 10) },
      { id: 'POS-003', title: 'Talent Acquisition Executive', department: 'HR', openings: 1, status: 'paused', deadline: now.toISOString().slice(0, 10) },
    ],
    candidates: [],
    interviews: [],
  };
}

function loadRecruitmentStore(): RecruitmentStore {
  try {
    const raw = localStorage.getItem(RECRUITMENT_STORAGE_KEY);
    if (!raw) return buildDefaultStore();
    const parsed = JSON.parse(raw) as RecruitmentStore;
    return {
      positions: Array.isArray(parsed.positions) ? parsed.positions : [],
      candidates: Array.isArray(parsed.candidates) ? parsed.candidates : [],
      interviews: Array.isArray(parsed.interviews) ? parsed.interviews : [],
    };
  } catch {
    return buildDefaultStore();
  }
}

function buildCandidateAvatar(name: string) {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=f1f5f9&color=0f172a&rounded=true&size=128`;
}

export function RecruitmentPage() {
  const { t } = useTranslation();
  const { actor } = useActor();
  const [searchParams] = useSearchParams();
  const [store, setStore] = useState<RecruitmentStore>(() => loadRecruitmentStore());
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' } | null>(null);
  const [query, setQuery] = useState('');
  const [stageFilter, setStageFilter] = useState<CandidateStage | 'all'>('all');
  const [sourceFilter, setSourceFilter] = useState<CandidateSource | 'all'>('all');
  const [isPositionModalOpen, setIsPositionModalOpen] = useState(false);
  const [isCandidateModalOpen, setIsCandidateModalOpen] = useState(false);
  const [isInterviewModalOpen, setIsInterviewModalOpen] = useState(false);
  const [isHireModalOpen, setIsHireModalOpen] = useState(false);
  const [isTransitionModalOpen, setIsTransitionModalOpen] = useState(false);
  const [isCandidateDetailModalOpen, setIsCandidateDetailModalOpen] = useState(false);
  const [isInterviewOutcomeModalOpen, setIsInterviewOutcomeModalOpen] = useState(false);
  const [selectedCandidateForHire, setSelectedCandidateForHire] = useState<CandidateRecord | null>(null);
  const [selectedCandidateDetail, setSelectedCandidateDetail] = useState<CandidateRecord | null>(null);
  const [selectedInterviewForOutcome, setSelectedInterviewForOutcome] = useState<InterviewItem | null>(null);
  const [transitionDraft, setTransitionDraft] = useState<{ candidateId: string; from: CandidateStage; to: CandidateStage } | null>(null);
  const [transitionEvaluation, setTransitionEvaluation] = useState('');
  const [interviewOutcomeDraft, setInterviewOutcomeDraft] = useState<{ outcome: InterviewOutcome; notes: string }>({ outcome: 'passed', notes: '' });
  const [isHiring, setIsHiring] = useState(false);
  const [adminCatalogs, setAdminCatalogs] = useState<AdminCatalogs>(loadAdminCatalogs);

  const [newPosition, setNewPosition] = useState({ title: '', department: '', openings: 1, status: 'open' as PositionItem['status'], deadline: '' });
  const [newCandidate, setNewCandidate] = useState({ fullName: '', email: '', phone: '', position: '', source: 'linkedin' as CandidateSource, avatarUrl: '', cvFileName: '', cvFileUrl: '' });
  const [newInterview, setNewInterview] = useState({ candidateId: '', interviewer: '', scheduledAt: '', mode: 'online' as InterviewItem['mode'] });
  const [hireForm, setHireForm] = useState<HireEmployeeFormState>(DEFAULT_HIRE_FORM);
  const canCreateEmployee = actor?.role === 'admin' || actor?.role === 'hr';

  const currentView = useMemo(() => parseRecruitmentView(searchParams.get('view')), [searchParams]);

  useEffect(() => {
    localStorage.setItem(RECRUITMENT_STORAGE_KEY, JSON.stringify(store));
  }, [store]);

  useEffect(() => {
    if (!actor) return;
    if (store.candidates.length > 0) return;
    const selectedActor = actor;

    async function loadInitialCandidates() {
      try {
        const result = await getRecruitmentCandidates(selectedActor);
        if (result.data.length) {
          setStore((current) => ({ ...current, candidates: result.data }));
        }
      } catch {
        // Keep local data when backend candidate API is unavailable.
      }
    }

    void loadInitialCandidates();
  }, [actor, store.candidates.length]);

  useEffect(() => {
    if (!actor || (!isHireModalOpen && !isCandidateModalOpen && !isPositionModalOpen)) {
      return;
    }

    const selectedActor = actor;
    async function loadCatalogs() {
      try {
        const result = await getAdminCatalogs(selectedActor);
        setAdminCatalogs(result.data);
      } catch {
        setAdminCatalogs(loadAdminCatalogs());
      }
    }

    void loadCatalogs();
  }, [actor, isCandidateModalOpen, isHireModalOpen, isPositionModalOpen]);

  const metrics = useMemo(() => {
    const activePositions = store.positions.filter((item) => item.status === 'open').length;
    const inPipeline = store.candidates.filter((item) => item.stage !== 'hired' && item.stage !== 'rejected').length;
    const interviewsThisWeek = store.interviews.filter((item) => {
      const day = new Date(item.scheduledAt);
      const now = new Date();
      const diff = Math.abs(day.getTime() - now.getTime());
      return diff <= 7 * 24 * 60 * 60 * 1000;
    }).length;
    const hiredCount = store.candidates.filter((item) => item.stage === 'hired').length;
    return { activePositions, inPipeline, interviewsThisWeek, hiredCount };
  }, [store]);

  const filteredCandidates = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return store.candidates.filter((item) => {
      const matchQuery =
        !normalized ||
        item.id.toLowerCase().includes(normalized) ||
        item.fullName.toLowerCase().includes(normalized) ||
        item.email.toLowerCase().includes(normalized) ||
        item.position.toLowerCase().includes(normalized);
      const matchStage = stageFilter === 'all' || item.stage === stageFilter;
      const matchSource = sourceFilter === 'all' || item.source === sourceFilter;
      return matchQuery && matchStage && matchSource;
    });
  }, [query, sourceFilter, stageFilter, store.candidates]);

  const pipelineMap = useMemo(() => {
    return stageOrder.reduce<Record<CandidateStage, CandidateRecord[]>>((acc, stage) => {
      acc[stage] = filteredCandidates.filter((item) => item.stage === stage);
      return acc;
    }, {
      new: [],
      screening: [],
      interview: [],
      offer: [],
      hired: [],
      rejected: [],
    });
  }, [filteredCandidates]);

  const interviewHistory = useMemo(() => {
    return store.interviews
      .filter((item) => item.status !== 'scheduled')
      .sort((a, b) => {
        const left = new Date(b.evaluatedAt || b.scheduledAt).getTime();
        const right = new Date(a.evaluatedAt || a.scheduledAt).getTime();
        return left - right;
      });
  }, [store.interviews]);

  function showToast(message: string, type: 'error' | 'success') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2600);
  }

  const candidateValidation = useMemo(() => {
    const emailRegex = /^\S+@\S+\.\S+$/;
    const phoneRaw = newCandidate.phone.trim();
    const normalizedPhone = phoneRaw.replace(/[^0-9]/g, '');
    const errors = {
      fullName: newCandidate.fullName.trim().length >= 3 ? '' : t('recruitment.validation.fullName'),
      email: emailRegex.test(newCandidate.email.trim()) ? '' : t('recruitment.validation.email'),
      phone: phoneRaw.length === 0 || (normalizedPhone.length >= 9 && normalizedPhone.length <= 12)
        ? ''
        : t('recruitment.validation.phone'),
    };

    const isValid = !errors.fullName && !errors.email && !errors.phone;
    return { errors, isValid };
  }, [newCandidate.email, newCandidate.fullName, newCandidate.phone, t]);

  function sourceBadgeClass(source: CandidateSource) {
    return `source-badge source-${source}`;
  }

  function sourceSelectClass(source: CandidateSource) {
    return `input-control source-pill-select source-pill-${source}`;
  }

  function openHireCandidateModal(candidate: CandidateRecord) {
    const preferredJobTitle = adminCatalogs['job-title'].find((item) => item.toLowerCase() === candidate.position.toLowerCase()) ?? '';
    setSelectedCandidateForHire(candidate);
    setHireForm({
      ...DEFAULT_HIRE_FORM,
      fullName: candidate.fullName,
      email: candidate.email,
      password: 'Welcome@123',
      role: 'employee',
      degree: 'Bachelor',
      startDate: new Date().toISOString().slice(0, 10),
      departmentId: adminCatalogs.departments[0] ?? '',
      employeeStatus: adminCatalogs['employee-status'][0] ?? '',
      jobCategory: adminCatalogs['job-categories'][0] ?? '',
      jobTitle: preferredJobTitle,
      photoDataUrl: candidate.avatarUrl || '',
    });
    setIsHireModalOpen(true);
  }

  function closeHireCandidateModal() {
    setIsHireModalOpen(false);
    setSelectedCandidateForHire(null);
    setHireForm(DEFAULT_HIRE_FORM);
  }

  async function handleHireCandidate(event: FormEvent) {
    event.preventDefault();
    if (!actor || !selectedCandidateForHire) return;
    if (!canCreateEmployee) {
      showToast(t('common.accessDenied'), 'error');
      return;
    }

    if (hireForm.fullName.trim().length < 3) {
      showToast(t('employees.create.validationFullName'), 'error');
      return;
    }

    if (hireForm.password.length < 8) {
      showToast(t('employees.create.validationPassword'), 'error');
      return;
    }

    if (!hireForm.gender) {
      showToast(t('employees.create.validationGender'), 'error');
      return;
    }

    if (!hireForm.dateOfBirth) {
      showToast(t('employees.create.validationDateOfBirth'), 'error');
      return;
    }

    if (!hireForm.startDate) {
      showToast(t('employees.create.validationStartDate'), 'error');
      return;
    }

    if (!hireForm.nationalId.trim()) {
      showToast(t('employees.create.validationNationalId'), 'error');
      return;
    }

    if (!hireForm.employeeStatus) {
      showToast(t('employees.create.validationEmployeeStatus'), 'error');
      return;
    }

    if (!hireForm.jobCategory) {
      showToast(t('employees.create.validationJobCategory'), 'error');
      return;
    }

    if (!hireForm.jobTitle) {
      showToast(t('employees.create.validationJobTitle'), 'error');
      return;
    }

    if (!hireForm.degree.trim()) {
      showToast(t('employees.create.validationDegree'), 'error');
      return;
    }

    if (!hireForm.photoDataUrl) {
      showToast(t('employees.create.validationPhoto'), 'error');
      return;
    }

    if (!hireForm.departmentId.trim()) {
      showToast(t('employees.create.validationDepartment'), 'error');
      return;
    }

    if (!hireForm.teamId.trim()) {
      showToast(t('employees.create.validationTeam'), 'error');
      return;
    }

    const payload: CreateEmployeePayload = {
      fullName: hireForm.fullName.trim(),
      email: hireForm.email.trim(),
      password: hireForm.password,
      role: hireForm.role,
      degree: hireForm.degree.trim(),
      departmentId: hireForm.departmentId.trim() || undefined,
      teamId: hireForm.teamId.trim() || undefined,
      gender: hireForm.gender,
      dateOfBirth: hireForm.dateOfBirth,
      startDate: hireForm.startDate,
      nationalId: hireForm.nationalId.trim(),
      address: hireForm.address.trim(),
      employeeStatus: hireForm.employeeStatus,
      jobCategory: hireForm.jobCategory,
      jobTitle: hireForm.jobTitle,
      photoUrl: hireForm.photoDataUrl,
    };

    setIsHiring(true);
    try {
      await createEmployee(actor, payload);
      setStore((current) => ({
        ...current,
        candidates: current.candidates.map((item) =>
          item.id === selectedCandidateForHire.id ? { ...item, stage: 'hired' } : item,
        ),
      }));
      setHireForm(DEFAULT_HIRE_FORM);
      setIsHireModalOpen(false);
      setSelectedCandidateForHire(null);
      showToast(t('recruitment.toast.hiredEmployeeAdded'), 'success');
    } catch {
      showToast(t('recruitment.validation.hireFailed'), 'error');
    } finally {
      setIsHiring(false);
    }
  }

  function handleHirePhotoUpload(file: File | null) {
    if (!file) {
      setHireForm((current) => ({ ...current, photoDataUrl: '' }));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : '';
      setHireForm((current) => ({ ...current, photoDataUrl: dataUrl }));
    };
    reader.readAsDataURL(file);
  }

  function handleCandidateAvatarChange(file: File | null) {
    if (!file) {
      setNewCandidate((prev) => ({ ...prev, avatarUrl: '' }));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      setNewCandidate((prev) => ({ ...prev, avatarUrl: result }));
    };
    reader.readAsDataURL(file);
  }

  function handleCandidateCvChange(file: File | null) {
    if (!file) {
      setNewCandidate((prev) => ({ ...prev, cvFileName: '', cvFileUrl: '' }));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      setNewCandidate((prev) => ({ ...prev, cvFileName: file.name, cvFileUrl: result }));
    };
    reader.readAsDataURL(file);
  }

  function stageLabel(stage: CandidateStage) {
    return t(`recruitment.stages.${stage}` as const, stage);
  }

  function sourceLabel(source: CandidateSource) {
    return t(`recruitment.sources.${source}` as const, source);
  }

  function addPosition(event: FormEvent) {
    event.preventDefault();
    if (newPosition.title.trim().length < 3) {
      showToast(t('recruitment.validation.positionTitle'), 'error');
      return;
    }

    setStore((current) => ({
      ...current,
      positions: [
        {
          id: `POS-${Math.floor(Math.random() * 9000 + 1000)}`,
          title: newPosition.title.trim(),
          department: newPosition.department.trim() || 'General',
          openings: newPosition.openings,
          status: newPosition.status,
          deadline: newPosition.deadline || undefined,
        },
        ...current.positions,
      ],
    }));
    setNewPosition({ title: '', department: '', openings: 1, status: 'open', deadline: '' });
    setIsPositionModalOpen(false);
    showToast(t('recruitment.toast.positionAdded'), 'success');
  }

  function openPositionModal() {
    setNewPosition((current) => ({
      ...current,
      title: current.title || adminCatalogs['job-title'][0] || '',
      department: current.department || adminCatalogs.departments[0] || '',
    }));
    setIsPositionModalOpen(true);
  }

  function openCandidateModal() {
    setNewCandidate((current) => ({
      ...current,
      position: current.position || adminCatalogs['job-title'][0] || '',
    }));
    setIsCandidateModalOpen(true);
  }

  function openCandidateDetailModal(candidate: CandidateRecord) {
    setSelectedCandidateDetail(candidate);
    setIsCandidateDetailModalOpen(true);
  }

  function closeCandidateDetailModal() {
    setIsCandidateDetailModalOpen(false);
    setSelectedCandidateDetail(null);
  }

  function addCandidate(event: FormEvent) {
    event.preventDefault();
    if (!candidateValidation.isValid) {
      showToast(t('recruitment.validation.candidateBasic'), 'error');
      return;
    }

    setStore((current) => ({
      ...current,
      candidates: [
        {
          id: `CAN-${Math.floor(Math.random() * 9000 + 1000)}`,
          fullName: newCandidate.fullName.trim(),
          email: newCandidate.email.trim(),
          phone: newCandidate.phone.trim() || undefined,
          position: newCandidate.position.trim() || 'General Position',
          stage: 'new',
          source: newCandidate.source,
          avatarUrl: newCandidate.avatarUrl || undefined,
          cvFileName: newCandidate.cvFileName || undefined,
          cvFileUrl: newCandidate.cvFileUrl || undefined,
          createdAt: new Date().toISOString(),
        },
        ...current.candidates,
      ],
    }));
    setNewCandidate({ fullName: '', email: '', phone: '', position: '', source: 'linkedin', avatarUrl: '', cvFileName: '', cvFileUrl: '' });
    setIsCandidateModalOpen(false);
    showToast(t('recruitment.toast.candidateAdded'), 'success');
  }

  function addInterview(event: FormEvent) {
    event.preventDefault();
    const candidate = store.candidates.find((item) => item.id === newInterview.candidateId);
    if (!candidate || !newInterview.interviewer.trim() || !newInterview.scheduledAt) {
      showToast(t('recruitment.validation.interviewBasic'), 'error');
      return;
    }

    setStore((current) => ({
      ...current,
      interviews: [
        {
          id: `INT-${Math.floor(Math.random() * 9000 + 1000)}`,
          candidateId: candidate.id,
          candidateName: candidate.fullName,
          position: candidate.position,
          interviewer: newInterview.interviewer.trim(),
          scheduledAt: newInterview.scheduledAt,
          mode: newInterview.mode,
          status: 'scheduled',
        },
        ...current.interviews,
      ],
      candidates: current.candidates.map((item) =>
        item.id === candidate.id && (item.stage === 'new' || item.stage === 'screening')
          ? { ...item, stage: 'interview' }
          : item,
      ),
    }));
    setNewInterview({ candidateId: '', interviewer: '', scheduledAt: '', mode: 'online' });
    setIsInterviewModalOpen(false);
    showToast(t('recruitment.toast.interviewAdded'), 'success');
  }

  function openTransitionModal(candidate: CandidateRecord) {
    const index = stageOrder.indexOf(candidate.stage);
    if (index < 0 || index >= stageOrder.length - 1) {
      return;
    }

    setTransitionDraft({
      candidateId: candidate.id,
      from: candidate.stage,
      to: stageOrder[index + 1],
    });
    setTransitionEvaluation('');
    setIsTransitionModalOpen(true);
  }

  function closeTransitionModal() {
    setIsTransitionModalOpen(false);
    setTransitionDraft(null);
    setTransitionEvaluation('');
  }

  function confirmTransition() {
    if (!transitionDraft) {
      return;
    }

    const trimmedEvaluation = transitionEvaluation.trim();
    if (trimmedEvaluation.length < 5) {
      showToast(t('recruitment.validation.stageEvaluation'), 'error');
      return;
    }

    setStore((current) => ({
      ...current,
      candidates: current.candidates.map((item) => {
        if (item.id !== transitionDraft.candidateId || item.stage !== transitionDraft.from) {
          return item;
        }

        const updatedReviews = [
          ...(item.stageReviews ?? []),
          {
            from: transitionDraft.from,
            to: transitionDraft.to,
            comment: trimmedEvaluation,
            createdAt: new Date().toISOString(),
            decidedById: actor?.id,
            decidedByName: actor?.fullName,
            decidedByRole: actor?.role,
          },
        ];

        return {
          ...item,
          stage: transitionDraft.to,
          stageReviews: updatedReviews,
        };
      }),
    }));

    closeTransitionModal();
    showToast(t('recruitment.toast.stageMoved'), 'success');
  }

  function openInterviewOutcomeModal(interview: InterviewItem) {
    setSelectedInterviewForOutcome(interview);
    setInterviewOutcomeDraft({ outcome: 'passed', notes: '' });
    setIsInterviewOutcomeModalOpen(true);
  }

  function closeInterviewOutcomeModal() {
    setIsInterviewOutcomeModalOpen(false);
    setSelectedInterviewForOutcome(null);
    setInterviewOutcomeDraft({ outcome: 'passed', notes: '' });
  }

  function submitInterviewOutcome(event: FormEvent) {
    event.preventDefault();
    if (!selectedInterviewForOutcome) {
      return;
    }

    const note = interviewOutcomeDraft.notes.trim();
    if (!note) {
      showToast(t('recruitment.validation.interviewOutcomeNote'), 'error');
      return;
    }

    const evaluatedAt = new Date().toISOString();
    const nextStatus = interviewOutcomeDraft.outcome === 'cancelled' ? 'cancelled' : 'done';

    setStore((current) => {
      const updatedInterviews = current.interviews.map((item) => {
        if (item.id !== selectedInterviewForOutcome.id) {
          return item;
        }

        return {
          ...item,
          status: nextStatus,
          outcome: interviewOutcomeDraft.outcome,
          notes: note,
          evaluatedById: actor?.id,
          evaluatedByName: actor?.fullName,
          evaluatedByRole: actor?.role,
          evaluatedAt,
        };
      });

      if (interviewOutcomeDraft.outcome !== 'passed') {
        return {
          ...current,
          interviews: updatedInterviews,
        };
      }

      const updatedCandidates = current.candidates.map((candidate) => {
        if (candidate.id !== selectedInterviewForOutcome.candidateId) {
          return candidate;
        }

        const currentIndex = stageOrder.indexOf(candidate.stage);
        if (currentIndex < 0 || currentIndex >= stageOrder.length - 1) {
          return candidate;
        }

        const nextStage = stageOrder[currentIndex + 1];
        return {
          ...candidate,
          stage: nextStage,
          stageReviews: [
            ...(candidate.stageReviews ?? []),
            {
              from: candidate.stage,
              to: nextStage,
              comment: note,
              createdAt: evaluatedAt,
              decidedById: actor?.id,
              decidedByName: actor?.fullName,
              decidedByRole: actor?.role,
            },
          ],
        };
      });

      return {
        ...current,
        interviews: updatedInterviews,
        candidates: updatedCandidates,
      };
    });

    closeInterviewOutcomeModal();
    showToast(t('recruitment.toast.interviewResultSaved'), 'success');
  }

  function renderPositions() {
    return (
      <>
        <div className="recruitment-toolbar">
          <button type="button" className="action-btn" onClick={openPositionModal}>
            <Plus size={16} /> {t('recruitment.addPosition')}
          </button>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t('recruitment.columns.position')}</th>
                <th>{t('recruitment.columns.department')}</th>
                <th>{t('recruitment.columns.openings')}</th>
                <th>{t('recruitment.columns.deadline')}</th>
                <th>{t('recruitment.columns.status')}</th>
              </tr>
            </thead>
            <tbody>
              {store.positions.map((position) => (
                <tr key={position.id}>
                  <td>{position.title}</td>
                  <td>{position.department}</td>
                  <td>{position.openings}</td>
                  <td>{position.deadline || '-'}</td>
                  <td><span className={`status-pill status-${position.status}`}>{t(`recruitment.positionStatus.${position.status}` as const, position.status)}</span></td>
                </tr>
              ))}
              {!store.positions.length && (
                <tr><td colSpan={5}>{t('common.empty')}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </>
    );
  }

  function renderCandidates() {
    return (
      <>
        <div className="recruitment-toolbar split recruitment-toolbar-aligned">
          <div className="recruitment-filters recruitment-filters-grid">
            <input className="input-control" placeholder={t('recruitment.searchPlaceholder')} value={query} onChange={(e) => setQuery(e.target.value)} />
            <select className="input-control" value={stageFilter} onChange={(e) => setStageFilter(e.target.value as CandidateStage | 'all')}>
              <option value="all">{t('recruitment.filters.allStages')}</option>
              {stageOrder.map((stage) => <option key={stage} value={stage}>{stageLabel(stage)}</option>)}
            </select>
            <select className="input-control" value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value as CandidateSource | 'all')}>
              <option value="all">{t('recruitment.filters.allSources')}</option>
              {['linkedin', 'referral', 'website', 'agency', 'other'].map((source) => (
                <option key={source} value={source}>{sourceLabel(source as CandidateSource)}</option>
              ))}
            </select>
          </div>
          <button type="button" className="action-btn" onClick={openCandidateModal}>
            <Plus size={16} /> {t('recruitment.addCandidate')}
          </button>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t('recruitment.columns.id')}</th>
                <th>{t('recruitment.columns.name')}</th>
                <th>{t('recruitment.columns.email')}</th>
                <th>{t('recruitment.columns.position')}</th>
                <th>{t('recruitment.columns.stage')}</th>
                <th>{t('recruitment.columns.source')}</th>
                <th>{t('recruitment.columns.createdAt')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredCandidates.map((candidate) => (
                <tr key={candidate.id} className="recruitment-clickable-row" onClick={() => openCandidateDetailModal(candidate)}>
                  <td>{candidate.id}</td>
                  <td>
                    <div className="candidate-name-cell">
                      <img
                        src={candidate.avatarUrl || buildCandidateAvatar(candidate.fullName)}
                        alt={candidate.fullName}
                        className="candidate-avatar-mini"
                      />
                      <span>{candidate.fullName}</span>
                    </div>
                  </td>
                  <td>{candidate.email}</td>
                  <td>{candidate.position}</td>
                  <td><span className="status-pill status-pending">{stageLabel(candidate.stage)}</span></td>
                  <td><span className={sourceBadgeClass(candidate.source)}>{sourceLabel(candidate.source)}</span></td>
                  <td>{new Date(candidate.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
              {!filteredCandidates.length && (
                <tr><td colSpan={7}>{t('common.empty')}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </>
    );
  }

  function renderPipeline() {
    return (
      <>
        <div className="recruitment-toolbar recruitment-toolbar-aligned">
          <div className="recruitment-filters recruitment-filters-grid">
            <input className="input-control" placeholder={t('recruitment.searchPlaceholder')} value={query} onChange={(e) => setQuery(e.target.value)} />
            <select className="input-control" value={stageFilter} onChange={(e) => setStageFilter(e.target.value as CandidateStage | 'all')}>
              <option value="all">{t('recruitment.filters.allStages')}</option>
              {stageOrder.map((stage) => <option key={stage} value={stage}>{stageLabel(stage)}</option>)}
            </select>
            <select className="input-control" value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value as CandidateSource | 'all')}>
              <option value="all">{t('recruitment.filters.allSources')}</option>
              {['linkedin', 'referral', 'website', 'agency', 'other'].map((source) => (
                <option key={source} value={source}>{sourceLabel(source as CandidateSource)}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="recruitment-pipeline">
          {stageOrder.map((stage) => (
            <section key={stage} className="recruitment-stage-column">
              <header>
                <h4>{stageLabel(stage)}</h4>
                <span>{pipelineMap[stage].length}</span>
              </header>
              <div className="recruitment-stage-list">
                {pipelineMap[stage].map((candidate) => (
                  <article className="recruitment-candidate-card" key={candidate.id} onClick={() => openCandidateDetailModal(candidate)}>
                    <h5>{candidate.fullName}</h5>
                    <p>{candidate.position}</p>
                    <small>{candidate.email}</small>
                    <div style={{ marginTop: '0.35rem' }}>
                      <span className={sourceBadgeClass(candidate.source)}>{sourceLabel(candidate.source)}</span>
                    </div>
                    <div className="recruitment-stage-actions" onClick={(event) => event.stopPropagation()}>
                      {candidate.stage === 'offer' ? (
                        <button type="button" className="mini-btn" onClick={() => openHireCandidateModal(candidate)}>{t('recruitment.addEmployee')}</button>
                      ) : candidate.stage !== 'hired' ? (
                        <button type="button" className="mini-btn" onClick={() => openTransitionModal(candidate)}>{t('recruitment.moveNext')}</button>
                      ) : null}
                    </div>
                  </article>
                ))}
                {!pipelineMap[stage].length && <p className="recruitment-empty-stage">{t('common.empty')}</p>}
              </div>
            </section>
          ))}
        </div>
      </>
    );
  }

  function renderInterviews() {
    return (
      <>
        <div className="recruitment-toolbar">
          <button type="button" className="action-btn" onClick={() => setIsInterviewModalOpen(true)}>
            <Plus size={16} /> {t('recruitment.addInterview')}
          </button>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t('recruitment.columns.candidate')}</th>
                <th>{t('recruitment.columns.position')}</th>
                <th>{t('recruitment.columns.interviewer')}</th>
                <th>{t('recruitment.columns.scheduledAt')}</th>
                <th>{t('recruitment.columns.mode')}</th>
                <th>{t('recruitment.columns.status')}</th>
                <th>{t('recruitment.columns.action')}</th>
              </tr>
            </thead>
            <tbody>
              {store.interviews.map((item) => (
                <tr key={item.id}>
                  <td>{item.candidateName}</td>
                  <td>{item.position}</td>
                  <td>{item.interviewer}</td>
                  <td>{new Date(item.scheduledAt).toLocaleString()}</td>
                  <td>{t(`recruitment.interviewMode.${item.mode}` as const, item.mode)}</td>
                  <td><span className="status-pill status-approved">{t(`recruitment.interviewStatus.${item.status}` as const, item.status)}</span></td>
                  <td>
                    {item.status === 'scheduled' ? (
                      <button type="button" className="mini-btn" onClick={() => openInterviewOutcomeModal(item)}>
                        {t('recruitment.interviewOutcome.open')}
                      </button>
                    ) : (
                      <span className="recruitment-history-note">{item.evaluatedByName || '-'}</span>
                    )}
                  </td>
                </tr>
              ))}
              {!store.interviews.length && (
                <tr><td colSpan={7}>{t('common.empty')}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </>
    );
  }

  function renderInterviewHistory() {
    return (
      <>
        <div className="recruitment-toolbar">
          <h3 className="section-title">{t('recruitment.interviewHistory.title')}</h3>
        </div>
        <p className="recruitment-modal-subtitle">{t('recruitment.interviewHistory.description')}</p>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t('recruitment.columns.candidate')}</th>
                <th>{t('recruitment.columns.position')}</th>
                <th>{t('recruitment.columns.scheduledAt')}</th>
                <th>{t('recruitment.interviewHistory.result')}</th>
                <th>{t('recruitment.interviewHistory.passedBy')}</th>
                <th>{t('recruitment.interviewHistory.evaluatedAt')}</th>
                <th>{t('recruitment.interviewHistory.note')}</th>
              </tr>
            </thead>
            <tbody>
              {interviewHistory.map((item) => {
                const candidate = store.candidates.find((candidateItem) => candidateItem.id === item.candidateId);
                const outcomeKey = item.outcome || 'cancelled';
                return (
                  <tr key={item.id} className="recruitment-clickable-row" onClick={() => candidate && openCandidateDetailModal(candidate)}>
                    <td>{item.candidateName}</td>
                    <td>{item.position}</td>
                    <td>{new Date(item.scheduledAt).toLocaleString()}</td>
                    <td><span className="status-pill status-pending">{t(`recruitment.interviewOutcome.types.${outcomeKey}` as const)}</span></td>
                    <td>{item.outcome === 'passed' ? item.evaluatedByName || '-' : '-'}</td>
                    <td>{item.evaluatedAt ? new Date(item.evaluatedAt).toLocaleString() : '-'}</td>
                    <td><span className="recruitment-history-note">{item.notes || '-'}</span></td>
                  </tr>
                );
              })}
              {!interviewHistory.length && (
                <tr><td colSpan={7}>{t('common.empty')}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </>
    );
  }

  return (
    <section className="module-grid">
      <article className="card main-card">
        {toast && <NotificationToast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        <h2>{t('recruitment.title')}</h2>
        <p>{t('recruitment.description')}</p>

        <section className="recruitment-metrics-grid">
          <article className="recruitment-metric-card">
            <BriefcaseBusiness size={18} />
            <div>
              <h4>{metrics.activePositions}</h4>
              <p>{t('recruitment.metrics.activePositions')}</p>
            </div>
          </article>
          <article className="recruitment-metric-card">
            <Users size={18} />
            <div>
              <h4>{metrics.inPipeline}</h4>
              <p>{t('recruitment.metrics.inPipeline')}</p>
            </div>
          </article>
          <article className="recruitment-metric-card">
            <CalendarClock size={18} />
            <div>
              <h4>{metrics.interviewsThisWeek}</h4>
              <p>{t('recruitment.metrics.interviewsThisWeek')}</p>
            </div>
          </article>
          <article className="recruitment-metric-card">
            <CircleDashed size={18} />
            <div>
              <h4>{metrics.hiredCount}</h4>
              <p>{t('recruitment.metrics.hired')}</p>
            </div>
          </article>
        </section>

        {currentView === 'positions' && renderPositions()}
        {currentView === 'candidates' && renderCandidates()}
        {currentView === 'pipeline' && renderPipeline()}
        {currentView === 'interview' && renderInterviews()}
        {currentView === 'interview-history' && renderInterviewHistory()}

        {isPositionModalOpen && (
          <div className="employee-modal-backdrop" onClick={() => setIsPositionModalOpen(false)}>
            <section className="employee-modal" onClick={(event) => event.stopPropagation()}>
              <div className="employee-modal-head">
                <h3>{t('recruitment.addPosition')}</h3>
                <button type="button" className="ghost-btn" onClick={() => setIsPositionModalOpen(false)}>{t('common.close')}</button>
              </div>
              <form className="employee-create-form recruitment-position-form" onSubmit={addPosition}>
                <label className="recruitment-field full-width" htmlFor="position-title-select">
                  <span>{t('recruitment.form.positionTitle')}</span>
                  <select
                    id="position-title-select"
                    className="input-control"
                    value={newPosition.title}
                    onChange={(e) => setNewPosition((prev) => ({ ...prev, title: e.target.value }))}
                    required
                  >
                    <option value="">{t('employees.create.selectPlaceholder')}</option>
                    {adminCatalogs['job-title'].map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="recruitment-field full-width" htmlFor="position-department-select">
                  <span>{t('recruitment.form.department')}</span>
                  <select
                    id="position-department-select"
                    className="input-control"
                    value={newPosition.department}
                    onChange={(e) => setNewPosition((prev) => ({ ...prev, department: e.target.value }))}
                    required
                  >
                    <option value="">{t('employees.create.selectPlaceholder')}</option>
                    {adminCatalogs.departments.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="form-grid-2 recruitment-position-grid">
                  <label className="recruitment-field" htmlFor="position-openings-input">
                    <span>{t('recruitment.columns.openings')}</span>
                    <input
                      id="position-openings-input"
                      type="number"
                      min={1}
                      className="input-control"
                      value={newPosition.openings}
                      onChange={(e) => setNewPosition((prev) => ({ ...prev, openings: Number(e.target.value) || 1 }))}
                    />
                  </label>

                  <label className="recruitment-field" htmlFor="position-deadline-input">
                    <span>{t('recruitment.columns.deadline')}</span>
                    <input
                      id="position-deadline-input"
                      type="date"
                      className="input-control"
                      value={newPosition.deadline}
                      onChange={(e) => setNewPosition((prev) => ({ ...prev, deadline: e.target.value }))}
                    />
                  </label>
                </div>
                <div className="form-actions" style={{ justifyContent: 'flex-end' }}>
                  <button type="submit" className="action-btn">{t('recruitment.save')}</button>
                </div>
              </form>
            </section>
          </div>
        )}

        {isCandidateModalOpen && (
          <div className="employee-modal-backdrop" onClick={() => setIsCandidateModalOpen(false)}>
            <section className="employee-modal recruitment-candidate-modal" onClick={(event) => event.stopPropagation()}>
              <div className="employee-modal-head">
                <div>
                  <h3>{t('recruitment.addCandidate')}</h3>
                  <p className="recruitment-modal-subtitle">{t('recruitment.addCandidateDescription')}</p>
                </div>
                <button type="button" className="mini-btn" onClick={() => setIsCandidateModalOpen(false)}>{t('recruitment.cancel')}</button>
              </div>
              <form className="employee-create-form recruitment-modal-form" onSubmit={addCandidate}>
                <div className="recruitment-modal-layout">
                  <div className="recruitment-modal-grid">
                    <label className="recruitment-field full-width">
                      <span>{t('recruitment.form.candidateName')}</span>
                      <input
                        className="input-control"
                        value={newCandidate.fullName}
                        onChange={(e) => setNewCandidate((prev) => ({ ...prev, fullName: e.target.value }))}
                        placeholder={t('recruitment.form.candidateNamePlaceholder')}
                        required
                      />
                      {candidateValidation.errors.fullName && <small className="recruitment-field-error">{candidateValidation.errors.fullName}</small>}
                    </label>

                    <label className="recruitment-field">
                      <span>{t('recruitment.form.email')}</span>
                      <input
                        type="email"
                        className="input-control"
                        value={newCandidate.email}
                        onChange={(e) => setNewCandidate((prev) => ({ ...prev, email: e.target.value }))}
                        placeholder={t('recruitment.form.emailPlaceholder')}
                        required
                      />
                      {candidateValidation.errors.email && <small className="recruitment-field-error">{candidateValidation.errors.email}</small>}
                    </label>

                    <label className="recruitment-field">
                      <span>{t('recruitment.form.phone')}</span>
                      <input
                        className="input-control"
                        value={newCandidate.phone}
                        onChange={(e) => setNewCandidate((prev) => ({ ...prev, phone: e.target.value }))}
                        placeholder={t('recruitment.form.phonePlaceholder')}
                      />
                      {candidateValidation.errors.phone && <small className="recruitment-field-error">{candidateValidation.errors.phone}</small>}
                    </label>

                    <label className="recruitment-field">
                      <span>{t('recruitment.form.positionTitle')}</span>
                      <select
                        className="input-control"
                        value={newCandidate.position}
                        onChange={(e) => setNewCandidate((prev) => ({ ...prev, position: e.target.value }))}
                        required
                      >
                        <option value="">{t('employees.create.selectPlaceholder')}</option>
                        {adminCatalogs['job-title'].map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="recruitment-field">
                      <span>{t('recruitment.form.source')}</span>
                      <select className={sourceSelectClass(newCandidate.source)} value={newCandidate.source} onChange={(e) => setNewCandidate((prev) => ({ ...prev, source: e.target.value as CandidateSource }))}>
                        {['linkedin', 'referral', 'website', 'agency', 'other'].map((source) => (
                          <option key={source} value={source}>{sourceLabel(source as CandidateSource)}</option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <aside className="recruitment-preview-panel">
                    <h4>{t('recruitment.form.previewTitle')}</h4>
                    <img
                      src={newCandidate.avatarUrl || buildCandidateAvatar(newCandidate.fullName || 'Candidate')}
                      alt="candidate"
                      className="recruitment-preview-avatar"
                    />
                    <div className="recruitment-preview-text">
                      <strong>{newCandidate.fullName || t('recruitment.form.candidateNamePlaceholder')}</strong>
                      <span>{newCandidate.email || t('recruitment.form.emailPlaceholder')}</span>
                      <span>{newCandidate.position || t('recruitment.form.positionPlaceholder')}</span>
                    </div>
                    <label className="recruitment-upload-label">
                      <span>{t('recruitment.form.avatar')}</span>
                      <input type="file" accept="image/*" onChange={(e) => handleCandidateAvatarChange(e.target.files?.[0] ?? null)} />
                    </label>
                    <label className="recruitment-upload-label">
                      <span>{t('recruitment.form.cv')}</span>
                      <input type="file" accept=".pdf,.doc,.docx" onChange={(e) => handleCandidateCvChange(e.target.files?.[0] ?? null)} />
                      <small>{newCandidate.cvFileName || t('recruitment.form.cvHint')}</small>
                    </label>
                    <span className={sourceBadgeClass(newCandidate.source)}>{sourceLabel(newCandidate.source)}</span>
                  </aside>
                </div>
                <div className="form-actions recruitment-modal-actions">
                  <button type="button" className="ghost-btn" onClick={() => setIsCandidateModalOpen(false)}>{t('recruitment.cancel')}</button>
                  <button type="submit" className="action-btn" disabled={!candidateValidation.isValid}>{t('recruitment.save')}</button>
                </div>
              </form>
            </section>
          </div>
        )}

        {isInterviewModalOpen && (
          <div className="employee-modal-backdrop" onClick={() => setIsInterviewModalOpen(false)}>
            <section className="employee-modal" onClick={(event) => event.stopPropagation()}>
              <div className="employee-modal-head">
                <h3>{t('recruitment.addInterview')}</h3>
                <button type="button" className="ghost-btn" onClick={() => setIsInterviewModalOpen(false)}>{t('common.close')}</button>
              </div>
              <form className="employee-create-form" onSubmit={addInterview}>
                <select className="input-control" value={newInterview.candidateId} onChange={(e) => setNewInterview((prev) => ({ ...prev, candidateId: e.target.value }))}>
                  <option value="">{t('recruitment.form.selectCandidate')}</option>
                  {store.candidates.filter((candidate) => candidate.stage !== 'hired' && candidate.stage !== 'rejected').map((candidate) => (
                    <option key={candidate.id} value={candidate.id}>{candidate.fullName} - {candidate.position}</option>
                  ))}
                </select>
                <input className="input-control" placeholder={t('recruitment.form.interviewer')} value={newInterview.interviewer} onChange={(e) => setNewInterview((prev) => ({ ...prev, interviewer: e.target.value }))} />
                <input type="datetime-local" className="input-control" value={newInterview.scheduledAt} onChange={(e) => setNewInterview((prev) => ({ ...prev, scheduledAt: e.target.value }))} />
                <select className="input-control" value={newInterview.mode} onChange={(e) => setNewInterview((prev) => ({ ...prev, mode: e.target.value as InterviewItem['mode'] }))}>
                  <option value="online">{t('recruitment.interviewMode.online')}</option>
                  <option value="offline">{t('recruitment.interviewMode.offline')}</option>
                </select>
                <div className="form-actions" style={{ justifyContent: 'flex-end' }}>
                  <button type="button" className="ghost-btn" onClick={() => setIsInterviewModalOpen(false)}>{t('common.close')}</button>
                  <button type="submit" className="action-btn">{t('recruitment.save')}</button>
                </div>
              </form>
            </section>
          </div>
        )}

        {isInterviewOutcomeModalOpen && selectedInterviewForOutcome && (
          <div className="employee-modal-backdrop" onClick={closeInterviewOutcomeModal}>
            <section className="employee-modal" onClick={(event) => event.stopPropagation()}>
              <div className="employee-modal-head">
                <h3>{t('recruitment.interviewOutcome.title')}</h3>
                <button type="button" className="ghost-btn" onClick={closeInterviewOutcomeModal}>{t('common.close')}</button>
              </div>
              <form className="employee-create-form" onSubmit={submitInterviewOutcome}>
                <label className="recruitment-field">
                  <span>{t('recruitment.interviewOutcome.resultLabel')}</span>
                  <select
                    className="input-control"
                    value={interviewOutcomeDraft.outcome}
                    onChange={(event) =>
                      setInterviewOutcomeDraft((current) => ({
                        ...current,
                        outcome: event.target.value as InterviewOutcome,
                      }))
                    }
                  >
                    <option value="passed">{t('recruitment.interviewOutcome.types.passed')}</option>
                    <option value="failed">{t('recruitment.interviewOutcome.types.failed')}</option>
                    <option value="cancelled">{t('recruitment.interviewOutcome.types.cancelled')}</option>
                  </select>
                </label>
                <label className="recruitment-field">
                  <span>{t('recruitment.interviewOutcome.noteLabel')}</span>
                  <textarea
                    className="input-control recruitment-evaluation-input"
                    value={interviewOutcomeDraft.notes}
                    onChange={(event) => setInterviewOutcomeDraft((current) => ({ ...current, notes: event.target.value }))}
                    placeholder={t('recruitment.interviewOutcome.notePlaceholder')}
                  />
                </label>
                <div className="form-actions" style={{ justifyContent: 'flex-end' }}>
                  <button type="button" className="ghost-btn" onClick={closeInterviewOutcomeModal}>{t('recruitment.cancel')}</button>
                  <button type="submit" className="action-btn">{t('recruitment.interviewOutcome.save')}</button>
                </div>
              </form>
            </section>
          </div>
        )}

        {isTransitionModalOpen && transitionDraft && (
          <div className="employee-modal-backdrop" onClick={closeTransitionModal}>
            <section className="employee-modal" onClick={(event) => event.stopPropagation()}>
              <div className="employee-modal-head">
                <h3>{t('recruitment.transitionModal.title')}</h3>
                <button type="button" className="ghost-btn" onClick={closeTransitionModal}>{t('common.close')}</button>
              </div>
              <div className="recruitment-transition-summary">
                <strong>
                  {stageLabel(transitionDraft.from)} {'->'} {stageLabel(transitionDraft.to)}
                </strong>
                <p>{t('recruitment.transitionModal.description')}</p>
              </div>
              <label className="recruitment-field full-width" htmlFor="candidate-stage-evaluation">
                <span>{t('recruitment.transitionModal.evaluationLabel')}</span>
                <textarea
                  id="candidate-stage-evaluation"
                  className="input-control recruitment-evaluation-input"
                  value={transitionEvaluation}
                  onChange={(event) => setTransitionEvaluation(event.target.value)}
                  placeholder={t('recruitment.transitionModal.evaluationPlaceholder')}
                />
              </label>
              <div className="form-actions" style={{ justifyContent: 'flex-end' }}>
                <button type="button" className="ghost-btn" onClick={closeTransitionModal}>{t('recruitment.cancel')}</button>
                <button type="button" className="action-btn" onClick={confirmTransition}>{t('recruitment.transitionModal.confirm')}</button>
              </div>
            </section>
          </div>
        )}

        {isCandidateDetailModalOpen && selectedCandidateDetail && (
          <div className="employee-modal-backdrop" onClick={closeCandidateDetailModal}>
            <section className="employee-modal recruitment-candidate-detail-modal" onClick={(event) => event.stopPropagation()}>
              <div className="employee-modal-head">
                <h3>{t('recruitment.candidateDetail.title')}</h3>
                <button type="button" className="ghost-btn" onClick={closeCandidateDetailModal}>{t('common.close')}</button>
              </div>
              <div className="recruitment-candidate-detail-grid">
                <aside className="recruitment-preview-panel">
                  <img
                    src={selectedCandidateDetail.avatarUrl || buildCandidateAvatar(selectedCandidateDetail.fullName)}
                    alt={selectedCandidateDetail.fullName}
                    className="recruitment-preview-avatar"
                  />
                  <div className="recruitment-preview-text">
                    <strong>{selectedCandidateDetail.fullName}</strong>
                    <span>{selectedCandidateDetail.position}</span>
                    <span>{selectedCandidateDetail.email}</span>
                    <span>{selectedCandidateDetail.phone || '-'}</span>
                  </div>
                  <span className={sourceBadgeClass(selectedCandidateDetail.source)}>{sourceLabel(selectedCandidateDetail.source)}</span>
                </aside>
                <div className="recruitment-candidate-detail-content">
                  <div className="recruitment-candidate-detail-section">
                    <h4>{t('recruitment.candidateDetail.applicationTitle')}</h4>
                    <p><strong>{t('recruitment.columns.id')}:</strong> {selectedCandidateDetail.id}</p>
                    <p><strong>{t('recruitment.columns.position')}:</strong> {selectedCandidateDetail.position}</p>
                    <p><strong>{t('recruitment.columns.stage')}:</strong> {stageLabel(selectedCandidateDetail.stage)}</p>
                    <p><strong>{t('recruitment.columns.createdAt')}:</strong> {new Date(selectedCandidateDetail.createdAt).toLocaleString()}</p>
                  </div>
                  <div className="recruitment-candidate-detail-section">
                    <h4>{t('recruitment.candidateDetail.cvTitle')}</h4>
                    {selectedCandidateDetail.cvFileName ? (
                      <>
                        <p>{selectedCandidateDetail.cvFileName}</p>
                        {selectedCandidateDetail.cvFileUrl && (
                          <a className="mini-btn recruitment-cv-link" href={selectedCandidateDetail.cvFileUrl} target="_blank" rel="noreferrer">
                            {t('recruitment.candidateDetail.openCv')}
                          </a>
                        )}
                      </>
                    ) : (
                      <p>{t('recruitment.candidateDetail.noCv')}</p>
                    )}
                  </div>
                  <div className="recruitment-candidate-detail-section">
                    <h4>{t('recruitment.candidateDetail.reviewTitle')}</h4>
                    {(selectedCandidateDetail.stageReviews ?? []).length ? (
                      <ul className="recruitment-stage-review-list">
                        {(selectedCandidateDetail.stageReviews ?? []).map((review) => (
                          <li key={`${review.from}-${review.to}-${review.createdAt}`}>
                            <strong>{stageLabel(review.from)} {'->'} {stageLabel(review.to)}</strong>
                            <span>{new Date(review.createdAt).toLocaleString()}</span>
                            <span>{t('recruitment.candidateDetail.decidedBy')}: {review.decidedByName || '-'}</span>
                            <p>{review.comment}</p>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p>{t('recruitment.candidateDetail.noReview')}</p>
                    )}
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}

        {isHireModalOpen && selectedCandidateForHire && (
          <div className="employee-modal-backdrop" onClick={closeHireCandidateModal}>
            <section className="employee-modal" onClick={(event) => event.stopPropagation()}>
              <div className="employee-modal-head">
                <h3>{t('employees.create.title')}</h3>
                <button type="button" className="ghost-btn" onClick={closeHireCandidateModal}>
                  {t('employees.create.cancel')}
                </button>
              </div>
              <form className="employee-create-form" onSubmit={handleHireCandidate}>
                <div className="employee-create-sections">
                  <fieldset className="employee-fieldset">
                    <legend className="employee-fieldset-legend">{t('employees.create.sections.personal')}</legend>
                    <div className="employee-create-grid">
                      <label className="employees-filter-item" htmlFor="hire-employee-photo">
                        <span>{t('employees.create.photo')}</span>
                        <input
                          id="hire-employee-photo"
                          className="input-control"
                          type="file"
                          accept="image/*"
                          onChange={(event) => handleHirePhotoUpload(event.target.files?.[0] ?? null)}
                          required={!hireForm.photoDataUrl}
                        />
                        {hireForm.photoDataUrl && (
                          <img className="employee-photo-preview" src={hireForm.photoDataUrl} alt={t('employees.create.photoPreviewAlt')} />
                        )}
                      </label>

                      <label className="employees-filter-item" htmlFor="hire-employee-full-name">
                        <span>{t('employees.create.fullName')}</span>
                        <input
                          id="hire-employee-full-name"
                          className="input-control"
                          value={hireForm.fullName}
                          onChange={(event) => setHireForm((current) => ({ ...current, fullName: event.target.value }))}
                          placeholder={t('employees.create.fullNamePlaceholder')}
                          required
                        />
                      </label>

                      <label className="employees-filter-item" htmlFor="hire-employee-gender">
                        <span>{t('employees.create.gender')}</span>
                        <select
                          id="hire-employee-gender"
                          className="input-control"
                          value={hireForm.gender}
                          onChange={(event) => setHireForm((current) => ({ ...current, gender: event.target.value }))}
                          required
                        >
                          <option value="">{t('employees.create.selectPlaceholder')}</option>
                          <option value="male">{t('employees.create.genderOptions.male')}</option>
                          <option value="female">{t('employees.create.genderOptions.female')}</option>
                          <option value="other">{t('employees.create.genderOptions.other')}</option>
                        </select>
                      </label>

                      <label className="employees-filter-item" htmlFor="hire-employee-date-of-birth">
                        <span>{t('employees.create.dateOfBirth')}</span>
                        <input
                          id="hire-employee-date-of-birth"
                          className="input-control"
                          type="date"
                          value={hireForm.dateOfBirth}
                          onChange={(event) => setHireForm((current) => ({ ...current, dateOfBirth: event.target.value }))}
                          required
                        />
                      </label>

                      <label className="employees-filter-item" htmlFor="hire-employee-national-id">
                        <span>{t('employees.create.nationalId')}</span>
                        <input
                          id="hire-employee-national-id"
                          className="input-control"
                          value={hireForm.nationalId}
                          onChange={(event) => setHireForm((current) => ({ ...current, nationalId: event.target.value }))}
                          placeholder={t('employees.create.nationalIdPlaceholder')}
                          required
                        />
                      </label>

                      <label className="employees-filter-item full-width" htmlFor="hire-employee-address">
                        <span>{t('employees.create.address')}</span>
                        <input
                          id="hire-employee-address"
                          className="input-control"
                          value={hireForm.address}
                          onChange={(event) => setHireForm((current) => ({ ...current, address: event.target.value }))}
                          placeholder={t('employees.create.addressPlaceholder')}
                        />
                      </label>
                    </div>
                  </fieldset>

                  <fieldset className="employee-fieldset">
                    <legend className="employee-fieldset-legend">{t('employees.create.sections.employment')}</legend>
                    <div className="employee-create-grid">
                      <label className="employees-filter-item" htmlFor="hire-employee-email">
                        <span>{t('employees.create.email')}</span>
                        <input
                          id="hire-employee-email"
                          className="input-control"
                          type="email"
                          value={hireForm.email}
                          onChange={(event) => setHireForm((current) => ({ ...current, email: event.target.value }))}
                          placeholder={t('employees.create.emailPlaceholder')}
                          required
                        />
                      </label>

                      <label className="employees-filter-item" htmlFor="hire-employee-password">
                        <span>{t('employees.create.password')}</span>
                        <input
                          id="hire-employee-password"
                          className="input-control"
                          type="password"
                          value={hireForm.password}
                          onChange={(event) => setHireForm((current) => ({ ...current, password: event.target.value }))}
                          placeholder={t('employees.create.passwordPlaceholder')}
                          required
                        />
                      </label>

                      <label className="employees-filter-item" htmlFor="hire-employee-role">
                        <span>{t('employees.create.role')}</span>
                        <select
                          id="hire-employee-role"
                          className="input-control"
                          value={hireForm.role}
                          onChange={(event) =>
                            setHireForm((current) => ({
                              ...current,
                              role: event.target.value as CreateEmployeePayload['role'],
                            }))
                          }
                        >
                          {ROLE_OPTIONS.map((role) => (
                            <option key={role} value={role}>
                              {role}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="employees-filter-item" htmlFor="hire-employee-start-date">
                        <span>{t('employees.create.startDate')}</span>
                        <input
                          id="hire-employee-start-date"
                          className="input-control"
                          type="date"
                          value={hireForm.startDate}
                          onChange={(event) => setHireForm((current) => ({ ...current, startDate: event.target.value }))}
                          required
                        />
                      </label>

                      <label className="employees-filter-item" htmlFor="hire-employee-status">
                        <span>{t('employees.create.employeeStatus')}</span>
                        <select
                          id="hire-employee-status"
                          className="input-control"
                          value={hireForm.employeeStatus}
                          onChange={(event) => setHireForm((current) => ({ ...current, employeeStatus: event.target.value }))}
                          required
                        >
                          <option value="">{t('employees.create.selectPlaceholder')}</option>
                          {adminCatalogs['employee-status'].map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="employees-filter-item" htmlFor="hire-employee-job-category">
                        <span>{t('employees.create.jobCategory')}</span>
                        <select
                          id="hire-employee-job-category"
                          className="input-control"
                          value={hireForm.jobCategory}
                          onChange={(event) => setHireForm((current) => ({ ...current, jobCategory: event.target.value }))}
                          required
                        >
                          <option value="">{t('employees.create.selectPlaceholder')}</option>
                          {adminCatalogs['job-categories'].map((category) => (
                            <option key={category} value={category}>
                              {category}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="employees-filter-item" htmlFor="hire-employee-job-title">
                        <span>{t('employees.create.jobTitle')}</span>
                        <select
                          id="hire-employee-job-title"
                          className="input-control"
                          value={hireForm.jobTitle}
                          onChange={(event) => setHireForm((current) => ({ ...current, jobTitle: event.target.value }))}
                          required
                        >
                          <option value="">{t('employees.create.selectPlaceholder')}</option>
                          {adminCatalogs['job-title'].map((job) => (
                            <option key={job} value={job}>
                              {job}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="employees-filter-item" htmlFor="hire-employee-department-id">
                        <span>{t('employees.create.departmentId')}</span>
                        <select
                          id="hire-employee-department-id"
                          className="input-control"
                          value={hireForm.departmentId}
                          onChange={(event) => setHireForm((current) => ({ ...current, departmentId: event.target.value }))}
                          required
                        >
                          <option value="">{t('employees.create.selectPlaceholder')}</option>
                          {adminCatalogs.departments.map((department) => (
                            <option key={department} value={department}>
                              {department}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="employees-filter-item" htmlFor="hire-employee-team-id">
                        <span>{t('employees.create.teamId')}</span>
                        <input
                          id="hire-employee-team-id"
                          className="input-control"
                          value={hireForm.teamId}
                          onChange={(event) => setHireForm((current) => ({ ...current, teamId: event.target.value }))}
                          placeholder={t('employees.create.teamPlaceholder')}
                          required
                        />
                      </label>
                    </div>
                  </fieldset>

                  <fieldset className="employee-fieldset">
                    <legend className="employee-fieldset-legend">{t('employees.create.sections.qualifications')}</legend>
                    <div className="employee-create-grid">
                      <label className="employees-filter-item full-width" htmlFor="hire-employee-degree">
                        <span>{t('employees.create.degree')}</span>
                        <input
                          id="hire-employee-degree"
                          className="input-control"
                          value={hireForm.degree}
                          onChange={(event) => setHireForm((current) => ({ ...current, degree: event.target.value }))}
                          placeholder={t('employees.create.degreePlaceholder')}
                          required
                        />
                      </label>

                      <label className="employees-filter-item" htmlFor="hire-employee-other-degrees">
                        <span>{t('employees.create.otherDegrees')}</span>
                        <input
                          id="hire-employee-other-degrees"
                          className="input-control"
                          type="file"
                          multiple
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(event) => setHireForm((current) => ({ ...current, otherDegreesFiles: event.target.files ? Array.from(event.target.files) : [] }))}
                        />
                        {hireForm.otherDegreesFiles.length > 0 && (
                          <div className="file-list-preview">
                            {hireForm.otherDegreesFiles.map((f, i) => (
                              <span key={i} className="file-preview-item">{f.name}</span>
                            ))}
                          </div>
                        )}
                      </label>

                      <label className="employees-filter-item" htmlFor="hire-employee-language-certs">
                        <span>{t('employees.create.languageCertificates')}</span>
                        <input
                          id="hire-employee-language-certs"
                          className="input-control"
                          type="file"
                          multiple
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(event) => setHireForm((current) => ({ ...current, languageCertificatesFiles: event.target.files ? Array.from(event.target.files) : [] }))}
                        />
                        {hireForm.languageCertificatesFiles.length > 0 && (
                          <div className="file-list-preview">
                            {hireForm.languageCertificatesFiles.map((f, i) => (
                              <span key={i} className="file-preview-item">{f.name}</span>
                            ))}
                          </div>
                        )}
                      </label>
                    </div>
                  </fieldset>
                </div>

                <div className="employee-create-actions">
                  <button className="mini-btn" type="submit" disabled={isHiring || !canCreateEmployee}>
                    {isHiring ? t('common.loading') : t('employees.create.submit')}
                  </button>
                </div>
              </form>
            </section>
          </div>
        )}
      </article>
    </section>
  );
}
