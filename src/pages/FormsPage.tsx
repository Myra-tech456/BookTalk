import { useEffect, useMemo, useState } from "react";
import AppLayout from "../components/AppLayout";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";

type QuestionType =
  | "short_text"
  | "long_text"
  | "single_choice"
  | "multiple_choice"
  | "checkboxes";

type FormQuestion = {
  id: string;
  title: string;
  type: QuestionType;
  required: boolean;
  options?: string[];
};

type FormItem = {
  id: string;
  title: string;
  description: string | null;
  questions: FormQuestion[];
  deadline: string;
  created_by: string;
  created_at: string;
};

type FormResponse = {
  id: string;
  form_id: string;
  user_id: string;
  answers: Record<string, string | string[]>;
  created_at: string;
  updated_at: string;
};

type Profile = {
  id: string;
  username: string | null;
  full_name: string | null;
};

function formatDateTime(dateString: string) {
  return new Date(dateString).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getTimeLeft(deadline: string) {
  const now = new Date().getTime();
  const end = new Date(deadline).getTime();
  const diff = end - now;

  if (diff <= 0) return "Expiré";

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);

  if (days > 0) return `${days}j ${hours}h ${minutes}min`;
  if (hours > 0) return `${hours}h ${minutes}min`;
  return `${minutes}min`;
}

function getFormStatus(deadline: string) {
  const now = new Date().getTime();
  const end = new Date(deadline).getTime();
  const diff = end - now;

  if (diff <= 0) return "expiré";
  if (diff <= 1000 * 60 * 60 * 24 * 2) return "bientôt terminé";
  return "ouvert";
}

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function createQuestion(): FormQuestion {
  return {
    id: generateId(),
    title: "",
    type: "short_text",
    required: true,
    options: ["", ""],
  };
}

function normalizeQuestions(input: any): FormQuestion[] {
  if (!Array.isArray(input)) return [];

  return input.map((question: any) => ({
    id: typeof question?.id === "string" ? question.id : generateId(),
    title: typeof question?.title === "string" ? question.title : "",
    type: [
      "short_text",
      "long_text",
      "single_choice",
      "multiple_choice",
      "checkboxes",
    ].includes(question?.type)
      ? question.type
      : "short_text",
    required: Boolean(question?.required),
    options: Array.isArray(question?.options)
      ? question.options.filter((option: unknown) => typeof option === "string")
      : [],
  }));
}

function normalizeAnswers(input: any): Record<string, string | string[]> {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};

  const normalized: Record<string, string | string[]> = {};

  Object.entries(input).forEach(([key, value]) => {
    if (typeof value === "string") {
      normalized[key] = value;
    } else if (Array.isArray(value)) {
      normalized[key] = value.filter((item) => typeof item === "string");
    }
  });

  return normalized;
}

function sanitizeQuestions(list: FormQuestion[]): FormQuestion[] {
  return list.map((question) => ({
    ...question,
    title: question.title.trim(),
    options: (question.options || []).map((option) => option.trim()).filter(Boolean),
  }));
}

export default function FormsPage() {
  const { user, role } = useAuth();
  const isAdmin = role === "admin" || role === "superadmin";

  const [forms, setForms] = useState<FormItem[]>([]);
  const [responses, setResponses] = useState<FormResponse[]>([]);
  const [profilesMap, setProfilesMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const [selectedForm, setSelectedForm] = useState<FormItem | null>(null);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [questions, setQuestions] = useState<FormQuestion[]>([createQuestion()]);
  const [submitting, setSubmitting] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editDeadline, setEditDeadline] = useState("");
  const [editQuestions, setEditQuestions] = useState<FormQuestion[]>([]);
  const [updating, setUpdating] = useState(false);

  const [responseSubmitting, setResponseSubmitting] = useState(false);

  const loadFormsAndResponses = async () => {
    setLoading(true);

    const { data: formsData, error: formsError } = await supabase
      .from("forms")
      .select("*")
      .order("created_at", { ascending: false });

    if (formsError) {
      console.error("Erreur chargement formulaires :", formsError.message);
      setForms([]);
      setResponses([]);
      setLoading(false);
      return;
    }

    const { data: responsesData, error: responsesError } = await supabase
      .from("form_responses")
      .select("*");

    if (responsesError) {
      console.error("Erreur chargement réponses :", responsesError.message);
      setResponses([]);
    }

    const allForms: FormItem[] = (formsData || []).map((form: any) => ({
      id: form.id,
      title: typeof form.title === "string" ? form.title : "",
      description: typeof form.description === "string" ? form.description : null,
      questions: normalizeQuestions(form.questions),
      deadline: form.deadline,
      created_by: form.created_by,
      created_at: form.created_at,
    }));

    const allResponses: FormResponse[] = ((responsesData || []) as any[]).map(
      (response) => ({
        id: response.id,
        form_id: response.form_id,
        user_id: response.user_id,
        answers: normalizeAnswers(response.answers),
        created_at: response.created_at,
        updated_at: response.updated_at,
      })
    );

    setForms(allForms);
    setResponses(allResponses);

    const authorIds = [...new Set(allForms.map((form) => form.created_by))];

    if (authorIds.length > 0) {
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, username, full_name")
        .in("id", authorIds);

      if (!profilesError && profilesData) {
        const map: Record<string, string> = {};
        (profilesData as Profile[]).forEach((profile) => {
          map[profile.id] =
            profile.username || profile.full_name || "Utilisateur";
        });
        setProfilesMap(map);
      }
    } else {
      setProfilesMap({});
    }

    setLoading(false);
  };

  useEffect(() => {
    loadFormsAndResponses();
  }, []);

  const activeForms = useMemo(() => {
    return forms.filter((form) => new Date(form.deadline).getTime() > Date.now());
  }, [forms]);

  const archivedForms = useMemo(() => {
    return forms.filter((form) => new Date(form.deadline).getTime() <= Date.now());
  }, [forms]);

  const resetCreateForm = () => {
    setTitle("");
    setDescription("");
    setDeadline("");
    setQuestions([createQuestion()]);
  };

  const addQuestion = () => {
    setQuestions((prev) => [...prev, createQuestion()]);
  };

  const removeQuestion = (questionId: string) => {
    setQuestions((prev) => prev.filter((q) => q.id !== questionId));
  };

  const updateQuestion = (
    questionId: string,
    field: keyof FormQuestion,
    value: any
  ) => {
    setQuestions((prev) =>
      prev.map((question) =>
        question.id === questionId ? { ...question, [field]: value } : question
      )
    );
  };

  const addQuestionOption = (questionId: string) => {
    setQuestions((prev) =>
      prev.map((question) =>
        question.id === questionId
          ? { ...question, options: [...(question.options || []), ""] }
          : question
      )
    );
  };

  const updateQuestionOptionValue = (
    questionId: string,
    optionIndex: number,
    value: string
  ) => {
    setQuestions((prev) =>
      prev.map((question) => {
        if (question.id !== questionId) return question;

        const nextOptions = [...(question.options || [])];
        nextOptions[optionIndex] = value;

        return { ...question, options: nextOptions };
      })
    );
  };

  const removeQuestionOption = (questionId: string, optionIndex: number) => {
    setQuestions((prev) =>
      prev.map((question) => {
        if (question.id !== questionId) return question;

        const nextOptions = [...(question.options || [])];
        nextOptions.splice(optionIndex, 1);

        return { ...question, options: nextOptions };
      })
    );
  };

  const validateQuestions = (list: FormQuestion[]) => {
    if (!list.length) {
      alert("Ajoute au moins une question.");
      return false;
    }

    for (const question of list) {
      if (!question.title.trim()) {
        alert("Chaque question doit avoir un intitulé.");
        return false;
      }

      if (
        ["single_choice", "multiple_choice", "checkboxes"].includes(question.type)
      ) {
        const cleanedOptions = (question.options || [])
          .map((option) => option.trim())
          .filter(Boolean);

        if (cleanedOptions.length < 2) {
          alert("Les questions à choix doivent avoir au moins 2 options.");
          return false;
        }
      }
    }

    return true;
  };

  const handleCreateForm = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) return;
    if (!title.trim()) {
      alert("Le titre est obligatoire.");
      return;
    }
    if (!deadline) {
      alert("La date limite est obligatoire.");
      return;
    }
    if (!validateQuestions(questions)) return;

    setSubmitting(true);

    const cleanedQuestions = sanitizeQuestions(questions);

    const { error } = await supabase.from("forms").insert({
      title: title.trim(),
      description: description.trim() || null,
      questions: cleanedQuestions,
      deadline: new Date(deadline).toISOString(),
      created_by: user.id,
    });

    setSubmitting(false);

    if (error) {
      alert(error.message);
      return;
    }

    resetCreateForm();
    setIsCreateModalOpen(false);
    loadFormsAndResponses();
  };

  const openEditModal = (form: FormItem) => {
    const localDeadline = new Date(form.deadline);
    const offset = localDeadline.getTimezoneOffset();
    const localDate = new Date(localDeadline.getTime() - offset * 60000)
      .toISOString()
      .slice(0, 16);

    setEditingId(form.id);
    setEditTitle(form.title);
    setEditDescription(form.description || "");
    setEditDeadline(localDate);
    setEditQuestions(normalizeQuestions(form.questions));
    setIsEditModalOpen(true);
  };

  const updateEditQuestion = (
    questionId: string,
    field: keyof FormQuestion,
    value: any
  ) => {
    setEditQuestions((prev) =>
      prev.map((question) =>
        question.id === questionId ? { ...question, [field]: value } : question
      )
    );
  };

  const addEditQuestion = () => {
    setEditQuestions((prev) => [...prev, createQuestion()]);
  };

  const removeEditQuestion = (questionId: string) => {
    setEditQuestions((prev) => prev.filter((q) => q.id !== questionId));
  };

  const addEditQuestionOption = (questionId: string) => {
    setEditQuestions((prev) =>
      prev.map((question) =>
        question.id === questionId
          ? { ...question, options: [...(question.options || []), ""] }
          : question
      )
    );
  };

  const updateEditQuestionOptionValue = (
    questionId: string,
    optionIndex: number,
    value: string
  ) => {
    setEditQuestions((prev) =>
      prev.map((question) => {
        if (question.id !== questionId) return question;

        const nextOptions = [...(question.options || [])];
        nextOptions[optionIndex] = value;

        return { ...question, options: nextOptions };
      })
    );
  };

  const removeEditQuestionOption = (questionId: string, optionIndex: number) => {
    setEditQuestions((prev) =>
      prev.map((question) => {
        if (question.id !== questionId) return question;

        const nextOptions = [...(question.options || [])];
        nextOptions.splice(optionIndex, 1);

        return { ...question, options: nextOptions };
      })
    );
  };

  const handleUpdateForm = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingId) return;
    if (!editTitle.trim()) {
      alert("Le titre est obligatoire.");
      return;
    }
    if (!editDeadline) {
      alert("La date limite est obligatoire.");
      return;
    }
    if (!validateQuestions(editQuestions)) return;

    setUpdating(true);

    const cleanedQuestions = sanitizeQuestions(editQuestions);

    const { error } = await supabase
      .from("forms")
      .update({
        title: editTitle.trim(),
        description: editDescription.trim() || null,
        questions: cleanedQuestions,
        deadline: new Date(editDeadline).toISOString(),
      })
      .eq("id", editingId);

    setUpdating(false);

    if (error) {
      alert(error.message);
      return;
    }

    setIsEditModalOpen(false);
    setSelectedForm(null);
    loadFormsAndResponses();
  };

  const handleDeleteForm = async (formId: string) => {
    const confirmed = window.confirm(
      "Supprimer ce formulaire ? Cette action est irréversible."
    );
    if (!confirmed) return;

    const { error } = await supabase.from("forms").delete().eq("id", formId);

    if (error) {
      alert(error.message);
      return;
    }

    if (selectedForm?.id === formId) {
      setSelectedForm(null);
    }

    loadFormsAndResponses();
  };

  const getCurrentUserResponse = (formId: string) => {
    if (!user) return null;
    return (
      responses.find(
        (response) => response.form_id === formId && response.user_id === user.id
      ) || null
    );
  };

  const openFormDetails = (form: FormItem) => {
    setSelectedForm(form);
    const existingResponse = getCurrentUserResponse(form.id);
    setAnswers(existingResponse ? normalizeAnswers(existingResponse.answers) : {});
  };

  const setAnswerValue = (questionId: string, value: string | string[]) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  };

  const toggleCheckboxAnswer = (questionId: string, option: string) => {
    const current = Array.isArray(answers[questionId])
      ? (answers[questionId] as string[])
      : [];

    const next = current.includes(option)
      ? current.filter((item) => item !== option)
      : [...current, option];

    setAnswerValue(questionId, next);
  };

  const validateAnswers = (form: FormItem) => {
    for (const question of form.questions) {
      if (!question.required) continue;

      const value = answers[question.id];

      if (question.type === "short_text" || question.type === "long_text") {
        if (!value || typeof value !== "string" || !value.trim()) {
          alert(`La question "${question.title}" est obligatoire.`);
          return false;
        }
      }

      if (question.type === "single_choice" || question.type === "multiple_choice") {
        if (!value || typeof value !== "string" || !value.trim()) {
          alert(`La question "${question.title}" est obligatoire.`);
          return false;
        }
      }

      if (question.type === "checkboxes") {
        if (!Array.isArray(value) || value.length === 0) {
          alert(`La question "${question.title}" est obligatoire.`);
          return false;
        }
      }
    }

    return true;
  };

  const handleSubmitResponse = async () => {
    if (!user || !selectedForm) return;

    if (getFormStatus(selectedForm.deadline) === "expiré") {
      alert("Ce formulaire est expiré.");
      return;
    }

    if (!validateAnswers(selectedForm)) return;

    setResponseSubmitting(true);

    const existingResponse = getCurrentUserResponse(selectedForm.id);
    let error = null;

    if (existingResponse) {
      const result = await supabase
        .from("form_responses")
        .update({
          answers,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingResponse.id);

      error = result.error;
    } else {
      const result = await supabase.from("form_responses").insert({
        form_id: selectedForm.id,
        user_id: user.id,
        answers,
      });

      error = result.error;
    }

    setResponseSubmitting(false);

    if (error) {
      alert(error.message);
      return;
    }

    await loadFormsAndResponses();
  };

  const FormCard = ({ form }: { form: FormItem }) => {
    const status = getFormStatus(form.deadline);
    const responseCount = responses.filter((r) => r.form_id === form.id).length;

    return (
      <button
        onClick={() => openFormDetails(form)}
        className="rounded-2xl border border-slate-800 bg-slate-900 p-5 text-left transition hover:border-violet-500/40 hover:bg-slate-800"
      >
        <div className="flex flex-wrap items-center gap-3">
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              status === "ouvert"
                ? "bg-emerald-400/20 text-emerald-300"
                : status === "bientôt terminé"
                ? "bg-amber-400/20 text-amber-300"
                : "bg-rose-500/20 text-rose-300"
            }`}
          >
            {status}
          </span>

          <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">
            {Array.isArray(form.questions) ? form.questions.length : 0} question(s)
          </span>
        </div>

        <h2 className="mt-4 text-2xl font-semibold text-white">{form.title}</h2>

        <p className="mt-3 line-clamp-3 text-slate-300">
          {form.description || "Aucune description."}
        </p>

        <div className="mt-4 space-y-1 text-sm text-slate-500">
          <p>Date limite : {formatDateTime(form.deadline)}</p>
          <p>Temps restant : {getTimeLeft(form.deadline)}</p>
          <p>Réponses : {responseCount}</p>
          <p>Auteur : {profilesMap[form.created_by] || "Utilisateur"}</p>
        </div>
      </button>
    );
  };

  return (
    <AppLayout title="Formulaires">
      <section className="space-y-6">
        <div className="rounded-3xl border-t-4 border-violet-500 bg-white p-6 shadow-sm dark:border-violet-400 dark:bg-slate-900">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-slate-500">
                Formulaires du groupe
              </p>
              <h1 className="mt-3 text-3xl font-bold text-slate-900 dark:text-white">
                Formulaires
              </h1>
              <p className="mt-3 max-w-2xl text-slate-600 dark:text-slate-300">
                Répondez aux formulaires ouverts du groupe dans une interface simple
                et claire.
              </p>
            </div>

            {isAdmin && (
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="rounded-xl bg-violet-600 px-4 py-3 font-semibold text-white transition hover:bg-violet-500"
              >
                Créer un formulaire
              </button>
            )}
          </div>
        </div>

        {isAdmin && (
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <p className="text-sm text-slate-400">Nombre total</p>
              <p className="mt-2 text-3xl font-bold text-white">{forms.length}</p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <p className="text-sm text-slate-400">Formulaires ouverts</p>
              <p className="mt-2 text-3xl font-bold text-white">
                {activeForms.length}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <p className="text-sm text-slate-400">Archives</p>
              <p className="mt-2 text-3xl font-bold text-white">
                {archivedForms.length}
              </p>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <h2 className="text-xl font-semibold text-white">Formulaires ouverts</h2>
          </div>

          {loading ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-slate-300">
              Chargement des formulaires...
            </div>
          ) : activeForms.length === 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-slate-300">
              Aucun formulaire ouvert.
            </div>
          ) : (
            <div className="grid gap-4">
              {activeForms.map((form) => (
                <FormCard key={form.id} form={form} />
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <h2 className="text-xl font-semibold text-white">Archives</h2>
          </div>

          {!loading && archivedForms.length === 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-slate-300">
              Aucun formulaire archivé.
            </div>
          ) : (
            <div className="grid gap-4">
              {archivedForms.map((form) => (
                <FormCard key={form.id} form={form} />
              ))}
            </div>
          )}
        </div>
      </section>

      {selectedForm && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 p-4">
          <div className="mx-auto max-w-3xl space-y-4">
            <div className="rounded-3xl border-t-8 border-violet-500 bg-white p-6 shadow-lg dark:border-violet-400 dark:bg-slate-900">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-3xl font-bold text-slate-900 dark:text-white">
                    {selectedForm.title}
                  </h2>
                  <p className="mt-3 text-slate-600 dark:text-slate-300">
                    {selectedForm.description || "Aucune description."}
                  </p>

                  <div className="mt-4 space-y-1 text-sm text-slate-500">
                    <p>Date limite : {formatDateTime(selectedForm.deadline)}</p>
                    <p>Temps restant : {getTimeLeft(selectedForm.deadline)}</p>
                    <p>
                      Auteur :{" "}
                      {profilesMap[selectedForm.created_by] || "Utilisateur"}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedForm(null)}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Fermer
                </button>
              </div>
            </div>

            {(selectedForm.questions || []).map((question, index) => (
              <div
                key={question.id}
                className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="mb-4">
                  <p className="text-lg font-semibold text-slate-900 dark:text-white">
                    {index + 1}. {question.title}
                    {question.required && (
                      <span className="ml-2 text-rose-500">*</span>
                    )}
                  </p>
                </div>

                {(question.type === "short_text" ||
                  question.type === "long_text") && (
                  <>
                    {question.type === "short_text" ? (
                      <input
                        type="text"
                        value={
                          typeof answers[question.id] === "string"
                            ? (answers[question.id] as string)
                            : ""
                        }
                        onChange={(e) =>
                          setAnswerValue(question.id, e.target.value)
                        }
                        disabled={getFormStatus(selectedForm.deadline) === "expiré"}
                        className="w-full border-b border-slate-300 bg-transparent px-1 py-3 text-slate-900 outline-none focus:border-violet-500 dark:border-slate-700 dark:text-white"
                        placeholder="Votre réponse"
                      />
                    ) : (
                      <textarea
                        value={
                          typeof answers[question.id] === "string"
                            ? (answers[question.id] as string)
                            : ""
                        }
                        onChange={(e) =>
                          setAnswerValue(question.id, e.target.value)
                        }
                        disabled={getFormStatus(selectedForm.deadline) === "expiré"}
                        rows={5}
                        className="w-full rounded-xl border border-slate-300 bg-transparent px-4 py-3 text-slate-900 outline-none focus:border-violet-500 dark:border-slate-700 dark:text-white"
                        placeholder="Votre réponse"
                      />
                    )}
                  </>
                )}

                {(question.type === "single_choice" ||
                  question.type === "multiple_choice") && (
                  <div className="space-y-3">
                    {(question.options || []).map((option) => (
                      <label
                        key={option}
                        className="flex items-center gap-3 text-slate-700 dark:text-slate-200"
                      >
                        <input
                          type="radio"
                          name={question.id}
                          checked={answers[question.id] === option}
                          onChange={() => setAnswerValue(question.id, option)}
                          disabled={getFormStatus(selectedForm.deadline) === "expiré"}
                        />
                        <span>{option}</span>
                      </label>
                    ))}
                  </div>
                )}

                {question.type === "checkboxes" && (
                  <div className="space-y-3">
                    {(question.options || []).map((option) => (
                      <label
                        key={option}
                        className="flex items-center gap-3 text-slate-700 dark:text-slate-200"
                      >
                        <input
                          type="checkbox"
                          checked={
                            Array.isArray(answers[question.id]) &&
                            (answers[question.id] as string[]).includes(option)
                          }
                          onChange={() =>
                            toggleCheckboxAnswer(question.id, option)
                          }
                          disabled={getFormStatus(selectedForm.deadline) === "expiré"}
                        />
                        <span>{option}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            ))}

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <button
                onClick={handleSubmitResponse}
                disabled={
                  responseSubmitting ||
                  getFormStatus(selectedForm.deadline) === "expiré"
                }
                className="rounded-xl bg-violet-600 px-6 py-3 font-semibold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {responseSubmitting
                  ? "Envoi en cours..."
                  : getCurrentUserResponse(selectedForm.id)
                  ? "Modifier ma réponse"
                  : "Envoyer"}
              </button>

              {getCurrentUserResponse(selectedForm.id) && (
                <p className="mt-3 text-sm text-slate-500">
                  Tu as déjà répondu à ce formulaire. Tu peux modifier ta réponse
                  tant qu’il est ouvert.
                </p>
              )}

              {isAdmin && (
                <div className="mt-6 flex flex-wrap gap-3">
                  <button
                    onClick={() => openEditModal(selectedForm)}
                    className="rounded-xl border border-slate-300 px-4 py-3 font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    Modifier le formulaire
                  </button>

                  <button
                    onClick={() => handleDeleteForm(selectedForm.id)}
                    className="rounded-xl bg-rose-600 px-4 py-3 font-semibold text-white transition hover:bg-rose-500"
                  >
                    Supprimer
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 p-4">
          <div className="mx-auto max-w-4xl rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-slate-500">
                  Nouveau formulaire
                </p>
                <h2 className="mt-2 text-2xl font-bold text-white">
                  Créer un formulaire
                </h2>
              </div>

              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="rounded-lg border border-slate-700 px-3 py-2 text-slate-300 hover:bg-slate-800"
              >
                Fermer
              </button>
            </div>

            <form onSubmit={handleCreateForm} className="mt-6 space-y-6">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Titre *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-violet-400"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Description courte
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-violet-400"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Date limite *
                </label>
                <input
                  type="datetime-local"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-violet-400"
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold text-white">Questions</h3>
                  <button
                    type="button"
                    onClick={addQuestion}
                    className="rounded-xl bg-violet-600 px-4 py-2 font-medium text-white hover:bg-violet-500"
                  >
                    Ajouter une question
                  </button>
                </div>

                {questions.map((question, index) => (
                  <div
                    key={question.id}
                    className="rounded-2xl border border-slate-800 bg-slate-950 p-5"
                  >
                    <div className="mb-4 flex items-center justify-between gap-4">
                      <h4 className="text-lg font-semibold text-white">
                        Question {index + 1}
                      </h4>

                      {questions.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeQuestion(question.id)}
                          className="rounded-lg border border-rose-500/40 px-3 py-2 text-sm text-rose-300 hover:bg-rose-500/10"
                        >
                          Supprimer
                        </button>
                      )}
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="mb-2 block text-sm font-medium text-slate-300">
                          Intitulé *
                        </label>
                        <input
                          type="text"
                          value={question.title}
                          onChange={(e) =>
                            updateQuestion(question.id, "title", e.target.value)
                          }
                          className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none focus:border-violet-400"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-medium text-slate-300">
                          Type de question
                        </label>
                        <select
                          value={question.type}
                          onChange={(e) =>
                            updateQuestion(
                              question.id,
                              "type",
                              e.target.value as QuestionType
                            )
                          }
                          className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none focus:border-violet-400"
                        >
                          <option value="short_text">Réponse courte</option>
                          <option value="long_text">Réponse longue</option>
                          <option value="single_choice">Choix unique</option>
                          <option value="multiple_choice">Choix multiple</option>
                          <option value="checkboxes">Cases à cocher</option>
                        </select>
                      </div>

                      {["single_choice", "multiple_choice", "checkboxes"].includes(
                        question.type
                      ) && (
                        <div className="space-y-3">
                          <label className="mb-2 block text-sm font-medium text-slate-300">
                            Options de réponse
                          </label>

                          {(question.options || []).map((option, optionIndex) => (
                            <div
                              key={`${question.id}-option-${optionIndex}`}
                              className="flex gap-3"
                            >
                              <input
                                type="text"
                                value={option}
                                onChange={(e) =>
                                  updateQuestionOptionValue(
                                    question.id,
                                    optionIndex,
                                    e.target.value
                                  )
                                }
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    addQuestionOption(question.id);
                                  }
                                }}
                                placeholder={`Option ${optionIndex + 1}`}
                                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none focus:border-violet-400"
                              />

                              {(question.options || []).length > 2 && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    removeQuestionOption(question.id, optionIndex)
                                  }
                                  className="rounded-xl border border-rose-500/40 px-4 py-3 text-rose-300 hover:bg-rose-500/10"
                                >
                                  Supprimer
                                </button>
                              )}
                            </div>
                          ))}

                          <button
                            type="button"
                            onClick={() => addQuestionOption(question.id)}
                            className="rounded-xl border border-slate-700 px-4 py-3 text-slate-300 transition hover:bg-slate-800"
                          >
                            Ajouter une option
                          </button>
                        </div>
                      )}

                      <label className="flex items-center gap-3 text-slate-300">
                        <input
                          type="checkbox"
                          checked={question.required}
                          onChange={(e) =>
                            updateQuestion(
                              question.id,
                              "required",
                              e.target.checked
                            )
                          }
                        />
                        Question obligatoire
                      </label>
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-xl bg-violet-600 px-4 py-3 font-semibold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Création en cours..." : "Publier le formulaire"}
              </button>
            </form>
          </div>
        </div>
      )}

      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 p-4">
          <div className="mx-auto max-w-4xl rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-slate-500">
                  Modifier
                </p>
                <h2 className="mt-2 text-2xl font-bold text-white">
                  Modifier le formulaire
                </h2>
              </div>

              <button
                onClick={() => setIsEditModalOpen(false)}
                className="rounded-lg border border-slate-700 px-3 py-2 text-slate-300 hover:bg-slate-800"
              >
                Fermer
              </button>
            </div>

            <form onSubmit={handleUpdateForm} className="mt-6 space-y-6">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Titre *
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-violet-400"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Description courte
                </label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={4}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-violet-400"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Date limite *
                </label>
                <input
                  type="datetime-local"
                  value={editDeadline}
                  onChange={(e) => setEditDeadline(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-violet-400"
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold text-white">Questions</h3>
                  <button
                    type="button"
                    onClick={addEditQuestion}
                    className="rounded-xl bg-violet-600 px-4 py-2 font-medium text-white hover:bg-violet-500"
                  >
                    Ajouter une question
                  </button>
                </div>

                {editQuestions.map((question, index) => (
                  <div
                    key={question.id}
                    className="rounded-2xl border border-slate-800 bg-slate-950 p-5"
                  >
                    <div className="mb-4 flex items-center justify-between gap-4">
                      <h4 className="text-lg font-semibold text-white">
                        Question {index + 1}
                      </h4>

                      {editQuestions.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeEditQuestion(question.id)}
                          className="rounded-lg border border-rose-500/40 px-3 py-2 text-sm text-rose-300 hover:bg-rose-500/10"
                        >
                          Supprimer
                        </button>
                      )}
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="mb-2 block text-sm font-medium text-slate-300">
                          Intitulé *
                        </label>
                        <input
                          type="text"
                          value={question.title}
                          onChange={(e) =>
                            updateEditQuestion(
                              question.id,
                              "title",
                              e.target.value
                            )
                          }
                          className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none focus:border-violet-400"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-medium text-slate-300">
                          Type de question
                        </label>
                        <select
                          value={question.type}
                          onChange={(e) =>
                            updateEditQuestion(
                              question.id,
                              "type",
                              e.target.value as QuestionType
                            )
                          }
                          className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none focus:border-violet-400"
                        >
                          <option value="short_text">Réponse courte</option>
                          <option value="long_text">Réponse longue</option>
                          <option value="single_choice">Choix unique</option>
                          <option value="multiple_choice">Choix multiple</option>
                          <option value="checkboxes">Cases à cocher</option>
                        </select>
                      </div>

                      {["single_choice", "multiple_choice", "checkboxes"].includes(
                        question.type
                      ) && (
                        <div className="space-y-3">
                          <label className="mb-2 block text-sm font-medium text-slate-300">
                            Options de réponse
                          </label>

                          {(question.options || []).map((option, optionIndex) => (
                            <div
                              key={`${question.id}-edit-option-${optionIndex}`}
                              className="flex gap-3"
                            >
                              <input
                                type="text"
                                value={option}
                                onChange={(e) =>
                                  updateEditQuestionOptionValue(
                                    question.id,
                                    optionIndex,
                                    e.target.value
                                  )
                                }
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    addEditQuestionOption(question.id);
                                  }
                                }}
                                placeholder={`Option ${optionIndex + 1}`}
                                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none focus:border-violet-400"
                              />

                              {(question.options || []).length > 2 && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    removeEditQuestionOption(
                                      question.id,
                                      optionIndex
                                    )
                                  }
                                  className="rounded-xl border border-rose-500/40 px-4 py-3 text-rose-300 hover:bg-rose-500/10"
                                >
                                  Supprimer
                                </button>
                              )}
                            </div>
                          ))}

                          <button
                            type="button"
                            onClick={() => addEditQuestionOption(question.id)}
                            className="rounded-xl border border-slate-700 px-4 py-3 text-slate-300 transition hover:bg-slate-800"
                          >
                            Ajouter une option
                          </button>
                        </div>
                      )}

                      <label className="flex items-center gap-3 text-slate-300">
                        <input
                          type="checkbox"
                          checked={question.required}
                          onChange={(e) =>
                            updateEditQuestion(
                              question.id,
                              "required",
                              e.target.checked
                            )
                          }
                        />
                        Question obligatoire
                      </label>
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="submit"
                disabled={updating}
                className="w-full rounded-xl bg-violet-600 px-4 py-3 font-semibold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {updating
                  ? "Modification en cours..."
                  : "Enregistrer les modifications"}
              </button>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}