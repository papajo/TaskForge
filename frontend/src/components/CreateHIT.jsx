import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api.js";

const TASK_TYPES = [
  { value: "bounding-box", label: "Bounding Box (computer vision annotation)" },
  { value: "classification", label: "Classification (label each item)" },
  { value: "categorization", label: "Categorization (products/images)" },
  { value: "moderation", label: "Content Moderation (approve/reject)" },
  { value: "data-collection", label: "Data Collection (form)" },
  { value: "hitl-validation", label: "HITL Validation (review model predictions)" },
];

export default function CreateHIT() {
  const [form, setForm] = useState({
    title: "",
    description: "",
    instructions: "",
    task_type: "classification",
    reward_cents: 5,
    target_assignments: 3,
    min_approval_rate: "",
    required_tags: "",
    itemsText: "",
    labelsText: "",
    fieldsText: "",
  });
  const [hint, setHint] = useState("");
  const [error, setError] = useState("");
  const nav = useNavigate();

  function set(field) {
    return (e) => setForm({ ...form, [field]: e.target.value });
  }

  function example() {
    if (form.task_type === "data-collection") {
      setForm((f) => ({ ...f, itemsText: '[{"id":1,"text":"OpenRestaurant menu page"},{"id":2,"text":"CityCafe homepage"}]', fieldsText: "cuisine, phone, address" }));
      setHint("Each item needs id + text, plus comma-separated form field names.");
    } else if (form.task_type === "hitl-validation" || form.task_type === "bounding-box") {
      setForm((f) => ({ ...f, itemsText: '[{"id":1,"url":"https://example.com/img1.jpg"},{"id":2,"url":"https://example.com/img2.jpg"}]' }));
      setHint("Each item needs id + url pointing to an image.");
    } else {
      setForm((f) => ({ ...f, itemsText: '[{"id":1,"text":"Sample text here"},{"id":2,"text":"Another snippet"}]' }));
      setHint("Each item needs id + text.");
    }
  }

  async function doSubmit(e) {
    e.preventDefault();
    setError("");
    let items;
    try {
      items = JSON.parse(form.itemsText || "[]");
    } catch (e2) {
      setError(`Items JSON invalid: ${e2.message}`);
      return;
    }
    const labels = form.labelsText.split(",").map((v) => v.trim()).filter(Boolean);
    const fields = form.fieldsText.split(",").map((v) => v.trim()).filter(Boolean);
    try {
      const res = await api.createHit({
        title: form.title,
        description: form.description,
        instructions: form.instructions,
        task_type: form.task_type,
        reward_cents: Number(form.reward_cents),
        target_assignments: Number(form.target_assignments),
        min_approval_rate: form.min_approval_rate === "" ? null : Number(form.min_approval_rate),
        required_tags: form.required_tags || null,
        items,
        labels,
        form_fields: fields.length ? fields : null,
      });
      nav(`/hits/${res.id}`);
    } catch (e3) {
      setError(e3.message);
    }
  }

  const needsLabels = ["classification", "categorization", "bounding-box", "hitl-validation"].includes(form.task_type);
  const needsFields = form.task_type === "data-collection";

  return (
    <div className="max-w-3xl mx-auto p-4">
      <h1 className="text-xl font-bold mb-4">Create HIT</h1>
      <form onSubmit={doSubmit} className="grid gap-3">
        <select value={form.task_type} onChange={set("task_type")} className="p-2 rounded bg-slate-800 border border-slate-700">
          {TASK_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <input placeholder="Title" required value={form.title} onChange={set("title")} className="p-2 rounded bg-slate-800 border border-slate-700" />
        <textarea placeholder="Description" required value={form.description} onChange={set("description")} className="p-2 rounded bg-slate-800 border border-slate-700" />
        <textarea placeholder="Detailed instructions for workers" required value={form.instructions} onChange={set("instructions")} className="p-2 rounded bg-slate-800 border border-slate-700" />
        <div className="flex gap-3 flex-wrap text-sm">
          <label>Reward (credits)
            <input type="number" min="1" value={form.reward_cents} onChange={set("reward_cents")} className="p-2 rounded bg-slate-800 border border-slate-700 w-28" />
          </label>
          <label>Assignments (overlap = quality)
            <input type="number" min="1" value={form.target_assignments} onChange={set("target_assignments")} className="p-2 rounded bg-slate-800 border border-slate-700 w-28" />
          </label>
          <label>Min approval % (optional)
            <input type="number" min="0" max="100" value={form.min_approval_rate} onChange={set("min_approval_rate")} className="p-2 rounded bg-slate-800 border border-slate-700 w-28" />
          </label>
          <label>Tags (optional)
            <input value={form.required_tags} onChange={set("required_tags")} className="p-2 rounded bg-slate-800 border border-slate-700 w-full sm:w-40" />
          </label>
        </div>
        {needsLabels && (
          <label className="text-sm">Allowed labels (comma separated, e.g. car, pedestrian)
            <input value={form.labelsText} onChange={set("labelsText")} className="p-2 rounded bg-slate-800 border border-slate-700 w-full" />
          </label>
        )}
        {needsFields && (
          <label className="text-sm">Form fields (comma separated)
            <input value={form.fieldsText} onChange={set("fieldsText")} className="p-2 rounded bg-slate-800 border border-slate-700 w-full" />
          </label>
        )}
        <label className="text-sm flex justify-between">Items (JSON array of {`{"id":1,"text":"..."}`} or {`{"id":1,"url":"..."}`})
          <button type="button" onClick={example} className="text-emerald-400 text-xs">insert example</button>
        </label>
        <textarea rows={6} required value={form.itemsText} onChange={set("itemsText")} className="p-2 rounded bg-slate-800 border border-slate-700 font-mono text-sm" placeholder='[{"id":1,"text":"..."}]' />
        {hint && <p className="text-xs text-slate-400">{hint}</p>}
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button className="bg-emerald-600 hover:bg-emerald-500 p-2 rounded font-medium">Publish HIT</button>
      </form>
    </div>
  );
}
