"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Station } from "@/lib/types";
import { formatPaisa } from "@/lib/money";
import {
  createCategory,
  updateCategory,
  deleteCategory,
  moveCategory,
  createItem,
  updateItem,
  deleteItem,
  moveItem,
  addModifierGroup,
  updateModifierGroup,
  deleteModifierGroup,
  addModifier,
  updateModifier,
  deleteModifier,
} from "@/lib/admin-actions";
import { ImageField } from "@/components/admin/ImageField";

interface ModifierDTO {
  id: string;
  name: string;
  priceDelta: number;
}
interface GroupDTO {
  id: string;
  name: string;
  minSelect: number;
  maxSelect: number;
  required: boolean;
  modifiers: ModifierDTO[];
}
interface ItemDTO {
  id: string;
  name: string;
  description: string | null;
  price: number;
  available: boolean;
  printerStation: Station;
  imageUrl: string | null;
  modifierGroups: GroupDTO[];
}
interface CategoryDTO {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  items: ItemDTO[];
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

const inputCls =
  "w-full bg-panel-2 border border-line rounded-lg px-3 py-2 outline-none focus:border-brand text-sm";
const btnGhost =
  "text-xs px-2 py-1 rounded-lg border border-line hover:border-brand/60 hover:text-text text-muted transition";

export function MenuManager({
  categories,
  stations,
}: {
  categories: CategoryDTO[];
  stations: Station[];
}) {
  const router = useRouter();
  const refresh = () => router.refresh();

  const [selectedCatId, setSelectedCatId] = useState<string | null>(
    categories[0]?.id ?? null
  );
  const [query, setQuery] = useState("");
  const [liveOnly, setLiveOnly] = useState(false);
  const [catModal, setCatModal] = useState<
    { mode: "create" } | { mode: "edit"; cat: CategoryDTO } | null
  >(null);
  const [itemModal, setItemModal] = useState<
    | { mode: "create"; catId: string }
    | { mode: "edit"; item: ItemDTO; catId: string }
    | null
  >(null);
  const [modsItem, setModsItem] = useState<{
    item: ItemDTO;
    catId: string;
  } | null>(null);

  const selectedCat =
    categories.find((c) => c.id === selectedCatId) ?? categories[0] ?? null;

  const items = useMemo(() => {
    if (!selectedCat) return [];
    const q = query.trim().toLowerCase();
    let list = [...selectedCat.items];
    if (liveOnly) list = list.filter((i) => i.available);
    if (q)
      list = list.filter(
        (i) => i.name.toLowerCase().includes(q) || i.description?.toLowerCase().includes(q)
      );
    return list;
  }, [selectedCat, query, liveOnly]);

  return (
    <div className="grid gap-4 lg:grid-cols-[280px_1fr] items-start">
      {/* ---------------------------------------------------------------- */}
      {/* Categories: master list with thumbnail, count, and row actions    */}
      {/* ---------------------------------------------------------------- */}
      <aside className="card p-3">
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs uppercase tracking-widest text-muted">
            Categories · {categories.length}
          </div>
          <button
            onClick={() => setCatModal({ mode: "create" })}
            className="btn-primary px-3 py-1.5 text-xs"
          >
            + New
          </button>
        </div>
        {categories.length === 0 ? (
          <div className="text-sm text-muted py-4 text-center">
            No categories yet.
          </div>
        ) : (
          <div className="space-y-1.5">
            {categories.map((c) => {
              const active = c.id === selectedCat.id;
              return (
                <div
                  key={c.id}
                  className={`group rounded-xl transition ${
                    active ? "bg-brand-soft ring-1 ring-brand/30" : "hover:bg-panel-2"
                  }`}
                >
                  <button
                    onClick={() => setSelectedCatId(c.id)}
                    className="w-full flex items-center gap-2.5 p-2 text-left"
                  >
                    {c.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={c.imageUrl}
                        alt=""
                        className="h-9 w-9 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="h-9 w-9 rounded-lg bg-panel-2 border border-line flex items-center justify-center text-brand font-bold text-sm">
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold truncate">{c.name}</div>
                      <div className="text-[10px] text-muted">
                        {c.items.length} item{c.items.length !== 1 ? "s" : ""}
                      </div>
                    </div>
                    {active ? (
                      <span className="text-brand text-xs">●</span>
                    ) : null}
                  </button>
                  <div className="row-actions hidden gap-1 px-2 group-hover:flex pb-1.5">
                    <button
                      title="Move up"
                      onClick={async () => {
                        await moveCategory(c.id, "up");
                        refresh();
                      }}
                      className={btnGhost}
                    >
                      ↑
                    </button>
                    <button
                      title="Move down"
                      onClick={async () => {
                        await moveCategory(c.id, "down");
                        refresh();
                      }}
                      className={btnGhost}
                    >
                      ↓
                    </button>
                    <button
                      onClick={() => setCatModal({ mode: "edit", cat: c })}
                      className={btnGhost}
                    >
                      Edit
                    </button>
                    <button
                      onClick={async () => {
                        if (!confirm(`Delete category "${c.name}"? Its items will be removed from the menu.`))
                          return;
                        await deleteCategory(c.id);
                        if (selectedCat.id === c.id) setSelectedCatId(null);
                        refresh();
                      }}
                      className={btnGhost + " hover:border-danger/50 hover:text-danger"}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </aside>

      {/* ---------------------------------------------------------------- */}
      {/* Items: filtered grid for the selected category                    */}
      {/* ---------------------------------------------------------------- */}
      <section className="space-y-3">
        <div className="card px-4 py-3 flex flex-wrap items-center gap-3">
          <div className="min-w-0">
            <h2 className="text-lg font-bold leading-tight">
              {selectedCat ? selectedCat.name : "Select a category"}
            </h2>
            <div className="text-xs text-muted">
              {items.length} shown · tap a category to filter
            </div>
          </div>
          <div className="flex-1 min-w-[200px]">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search items…"
              className={inputCls}
            />
          </div>
          <label className="flex items-center gap-1.5 text-xs text-muted">
            <input
              type="checkbox"
              checked={liveOnly}
              onChange={(e) => setLiveOnly(e.target.checked)}
            />
            Live only
          </label>
          <button
            onClick={() => {
              if (selectedCat) setItemModal({ mode: "create", catId: selectedCat.id });
            }}
            disabled={!selectedCat}
            className="btn-primary px-4 py-2 text-sm disabled:opacity-40"
          >
            + Add Item
          </button>
        </div>

        {items.length === 0 ? (
          <div className="card p-10 text-center text-muted">
            No items here yet.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
            {items.map((item) => (
              <div key={item.id} className="card overflow-hidden">
                <div className="relative h-24 bg-panel-2 flex items-center justify-center">
                  {item.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="text-3xl opacity-30">🍽️</div>
                  )}
                  <span
                    className={`absolute top-2 right-2 text-[10px] uppercase px-2 py-0.5 rounded-full font-semibold ${
                      item.available
                        ? "bg-success-soft text-success"
                        : "bg-danger/10 text-danger"
                    }`}
                  >
                    {item.available ? "Live" : "Hidden"}
                  </span>
                </div>
                <div className="p-3 space-y-2">
                  <div className="flex items-start justify-between gap-1">
                    <div className="font-semibold leading-tight truncate">
                      {item.name}
                    </div>
                    <div className="text-brand font-bold shrink-0">
                      {formatPaisa(item.price)}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px]">
                    <span className="px-2 py-0.5 rounded-full bg-panel-2 text-muted uppercase tracking-wide">
                      {item.printerStation}
                    </span>
                    {item.modifierGroups.length > 0 ? (
                      <span className="px-2 py-0.5 rounded-full bg-brand-soft text-brand">
                        {item.modifierGroups.length} mod group
                        {item.modifierGroups.length !== 1 ? "s" : ""}
                      </span>
                    ) : null}
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-line">
                    <label className="flex items-center gap-1.5 text-xs text-muted">
                      <input
                        type="checkbox"
                        checked={item.available}
                        onChange={async (e) => {
                          await updateItem(item.id, { available: e.target.checked });
                          refresh();
                        }}
                      />
                      Stage
                    </label>
                    <div className="flex gap-1">
                      <button
                        title="Move up"
                        onClick={async () => {
                          await moveItem(item.id, "up");
                          refresh();
                        }}
                        className={btnGhost}
                      >
                        ↑
                      </button>
                      <button
                        title="Move down"
                        onClick={async () => {
                          await moveItem(item.id, "down");
                          refresh();
                        }}
                        className={btnGhost}
                      >
                        ↓
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    <button
                      onClick={() =>
                        setModsItem({ item, catId: selectedCat!.id })
                      }
                      className={btnGhost + " text-center"}
                    >
                      Customize
                    </button>
                    <button
                      onClick={() =>
                        setItemModal({
                          mode: "edit",
                          item,
                          catId: selectedCat!.id,
                        })
                      }
                      className={btnGhost + " text-center"}
                    >
                      Edit
                    </button>
                    <button
                      onClick={async () => {
                        if (confirm(`Delete "${item.name}"?`)) {
                          await deleteItem(item.id);
                          refresh();
                        }
                      }}
                      className={
                        btnGhost +
                        " text-center hover:border-danger/50 hover:text-danger"
                      }
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* hiding any child on quick layout shift is handled by state above */}
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Modals                                                             */}
      {/* ---------------------------------------------------------------- */}
      {catModal ? (
        <CategoryModal
          initial={catModal.mode === "edit" ? catModal.cat : null}
          onClose={() => setCatModal(null)}
          onSaved={() => {
            setCatModal(null);
            refresh();
          }}
        />
      ) : null}

      {itemModal ? (
        <ItemModal
          mode={itemModal.mode}
          item={itemModal.mode === "edit" ? itemModal.item : null}
          defaultCategoryId={itemModal.catId}
          categories={categories}
          stations={stations}
          onClose={() => setItemModal(null)}
          onSaved={() => {
            setItemModal(null);
            refresh();
          }}
        />
      ) : null}

      {modsItem ? (
        <ModifierModal
          item={modsItem.item}
          onClose={() => setModsItem(null)}
          onChanged={refresh}
        />
      ) : null}
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Category create/edit                                                    */
/* ---------------------------------------------------------------------- */
function CategoryModal({
  initial,
  onClose,
  onSaved,
}: {
  initial: CategoryDTO | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [imageUrl, setImageUrl] = useState(initial?.imageUrl ?? "");
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!name.trim()) return;
    setBusy(true);
    try {
      if (initial) {
        await updateCategory(initial.id, { name: name.trim(), imageUrl: imageUrl || null });
      } else {
        await createCategory(name.trim(), slugify(name.trim()), imageUrl || null);
      }
      onSaved();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="card w-full max-w-sm p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold">
            {initial ? `Edit "${initial.name}"` : "New Category"}
          </h3>
          <button onClick={onClose} className="text-muted hover:text-text">×</button>
        </div>
        <label className="block text-sm space-y-1">
          <span className="text-xs uppercase tracking-widest text-muted">
            Category name
          </span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Starters, BBQ, Karahi…"
            className={inputCls}
            autoFocus
          />
        </label>
        <ImageField
          label="Category picture"
          folder="categories"
          value={imageUrl}
          onUploaded={(u) => setImageUrl(u ?? "")}
        />
        <div className="flex gap-2 pt-1">
          <button
            onClick={save}
            disabled={busy || !name.trim()}
            className="btn-primary flex-1 py-2 text-sm disabled:opacity-40"
          >
            {busy ? "Saving…" : initial ? "Save Changes" : "Create Category"}
          </button>
          <button onClick={onClose} className="btn-secondary px-4 py-2 text-sm">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Item create/edit                                                        */
/* ---------------------------------------------------------------------- */
function ItemModal({
  mode,
  item,
  defaultCategoryId,
  categories,
  stations,
  onClose,
  onSaved,
}: {
  mode: "create" | "edit";
  item: ItemDTO | null;
  defaultCategoryId: string;
  categories: CategoryDTO[];
  stations: Station[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(item?.name ?? "");
  const [price, setPrice] = useState(item ? (item.price / 100).toString() : "");
  const [categoryId, setCategoryId] = useState(defaultCategoryId);
  const [station, setStation] = useState<Station>(item?.printerStation ?? "MAIN");
  const [description, setDescription] = useState(item?.description ?? "");
  const [imageUrl, setImageUrl] = useState(item?.imageUrl ?? "");
  const [available, setAvailable] = useState(item?.available ?? true);
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!name.trim() || !price || !categoryId) return;
    setBusy(true);
    try {
      if (mode === "edit" && item) {
        await updateItem(item.id, {
          name: name.trim(),
          priceRupees: Number(price),
          categoryId,
          station,
          description,
          imageUrl: imageUrl || null,
          available,
        });
      } else {
        await createItem({
          name: name.trim(),
          priceRupees: Number(price),
          categoryId,
          station,
          description,
          imageUrl: imageUrl || null,
          available,
        });
      }
      onSaved();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="card w-full max-w-md p-5 space-y-4 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold">
            {mode === "edit" ? `Edit "${item!.name}"` : "New Menu Item"}
          </h3>
          <button onClick={onClose} className="text-muted hover:text-text">×</button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm space-y-1 col-span-2">
            <span className="text-xs uppercase tracking-widest text-muted">Name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Chicken Karahi"
              className={inputCls}
              autoFocus
            />
          </label>
          <label className="text-sm space-y-1">
            <span className="text-xs uppercase tracking-widest text-muted">Price (Rs)</span>
            <input
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0.00"
              inputMode="decimal"
              className={inputCls}
            />
          </label>
          <label className="text-sm space-y-1">
            <span className="text-xs uppercase tracking-widest text-muted">Kitchen station</span>
            <select
              value={station}
              onChange={(e) => setStation(e.target.value as Station)}
              className={inputCls}
            >
              {stations.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </label>
          <label className="text-sm space-y-1 col-span-2">
            <span className="text-xs uppercase tracking-widest text-muted">Category</span>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className={inputCls}
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </label>
          <label className="text-sm space-y-1 col-span-2">
            <span className="text-xs uppercase tracking-widest text-muted">Description</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Shown on the POS card…"
              rows={2}
              className={inputCls}
            />
          </label>
        </div>

        <ImageField
          label="Item picture"
          folder="items"
          value={imageUrl}
          onUploaded={(u) => setImageUrl(u ?? "")}
        />

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={available}
            onChange={(e) => setAvailable(e.target.checked)}
          />
          <span className="font-medium">Live on POS</span>
          <span className="text-xs text-muted">(untick to hide while out of stock)</span>
        </label>

        <div className="flex gap-2 pt-1">
          <button
            onClick={save}
            disabled={busy || !name.trim() || !price}
            className="btn-primary flex-1 py-2 disabled:opacity-40"
          >
            {busy ? "Saving…" : mode === "edit" ? "Save Changes" : "Add to Menu"}
          </button>
          <button onClick={onClose} className="btn-secondary px-4 py-2 text-sm">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Modifier groups (Customize)                                             */
/* ---------------------------------------------------------------------- */
function ModifierModal({
  item,
  onClose,
  onChanged,
}: {
  item: ItemDTO;
  onClose: () => void;
  onChanged: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="card w-full max-w-xl p-5 space-y-4 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold">Customizations</h3>
            <div className="text-xs text-muted">
              Options for <span className="font-semibold text-text">{item.name}</span>
            </div>
          </div>
          <button onClick={onClose} className="text-muted hover:text-text">×</button>
        </div>
        <ModifierGroupsEditor item={item} onChanged={onChanged} />
      </div>
    </div>
  );
}

function ModifierGroupsEditor({
  item,
  onChanged,
}: {
  item: ItemDTO;
  onChanged: () => void;
}) {
  return (
    <div className="space-y-4">
      <GroupList item={item} onChanged={onChanged} />
      <AddGroupForm itemId={item.id} onChanged={onChanged} />
    </div>
  );
}

function GroupList({
  item,
  onChanged,
}: {
  item: ItemDTO;
  onChanged: () => void;
}) {
  const [minSel, setMinSel] = useState<Record<string, string>>({});
  const [maxSel, setMaxSel] = useState<Record<string, string>>({});
  const [reqs, setReqs] = useState<Record<string, boolean>>({});
  const [mods, setMods] = useState<Record<string, string>>({}); // modId -> name
  const [deltas, setDeltas] = useState<Record<string, string>>({}); // modId -> "0.00"
  const [groupNames, setGroupNames] = useState<Record<string, string>>({});

  return (
    <div className="space-y-3">
      {item.modifierGroups.length === 0 ? (
        <div className="text-sm text-muted py-2">
          No customizations yet. Add a group like “Size”, “Garnish” or “Spice level”.
        </div>
      ) : null}
      {item.modifierGroups.map((g) => (
        <div key={g.id} className="rounded-xl border border-line p-3 space-y-3">
          <div className="flex flex-wrap gap-2 items-center">
            <input
              value={groupNames[g.id] ?? g.name}
              onChange={(e) =>
                setGroupNames((s) => ({ ...s, [g.id]: e.target.value }))
              }
              placeholder="Group name"
              className={inputCls + " flex-1 min-w-[140px]"}
            />
            <input
              value={minSel[g.id] ?? String(g.minSelect)}
              onChange={(e) =>
                setMinSel((s) => ({ ...s, [g.id]: e.target.value }))
              }
              type="number"
              title="Min select"
              className={inputCls + " w-16"}
            />
            <span className="text-xs text-muted">to</span>
            <input
              value={maxSel[g.id] ?? String(g.maxSelect)}
              onChange={(e) =>
                setMaxSel((s) => ({ ...s, [g.id]: e.target.value }))
              }
              type="number"
              title="Max select"
              className={inputCls + " w-16"}
            />
            <label className="flex items-center gap-1 text-xs text-muted">
              <input
                type="checkbox"
                checked={reqs[g.id] ?? g.required}
                onChange={(e) =>
                  setReqs((s) => ({ ...s, [g.id]: e.target.checked }))
                }
              />
              Required
            </label>
            <div className="flex gap-1 ml-auto">
              <button
                onClick={async () => {
                  await updateModifierGroup(g.id, {
                    name: (groupNames[g.id] ?? g.name).trim() || g.name,
                    minSelect: Number(minSel[g.id] ?? g.minSelect),
                    maxSelect: Number(maxSel[g.id] ?? g.maxSelect),
                    required: reqs[g.id] ?? g.required,
                  });
                  onChanged();
                }}
                className={btnGhost}
              >
                Save group
              </button>
              <button
                onClick={async () => {
                  if (confirm(`Delete group "${g.name}"?`)) {
                    await deleteModifierGroup(g.id);
                    onChanged();
                  }
                }}
                className={btnGhost + " hover:text-danger"}
              >
                Delete
              </button>
            </div>
          </div>

          <div className="space-y-1.5 pl-1">
            {g.modifiers.map((m) => (
              <div key={m.id} className="flex items-center gap-2">
                <input
                  value={mods[m.id] ?? m.name}
                  onChange={(e) => setMods((s) => ({ ...s, [m.id]: e.target.value }))}
                  placeholder="Option name"
                  className={inputCls + " flex-1"}
                />
                <div className="flex items-center gap-0.5">
                  <span className="text-xs text-muted">Rs</span>
                  <input
                    value={deltas[m.id] ?? (m.priceDelta / 100).toString()}
                    onChange={(e) =>
                      setDeltas((s) => ({ ...s, [m.id]: e.target.value }))
                    }
                    inputMode="decimal"
                    placeholder="0.00"
                    className={inputCls + " w-20"}
                  />
                </div>
                <button
                  onClick={async () => {
                    await updateModifier(m.id, {
                      name: (mods[m.id] ?? m.name).trim() || m.name,
                      priceDeltaRupees: Number(deltas[m.id] ?? 0),
                    });
                    setMods((s) => ({ ...s, [m.id]: "" }));
                    setDeltas((s) => ({ ...s, [m.id]: "" }));
                    onChanged();
                  }}
                  className={btnGhost}
                  title="Save option"
                >
                  ✓
                </button>
                <button
                  onClick={async () => {
                    if (confirm(`Remove option "${m.name}"?`)) {
                      await deleteModifier(m.id);
                      onChanged();
                    }
                  }}
                  className={btnGhost + " hover:text-danger"}
                >
                  ✕
                </button>
              </div>
            ))}
            <AddModifierRow groupId={g.id} onChanged={onChanged} />
          </div>
        </div>
      ))}
    </div>
  );
}

function AddModifierRow({
  groupId,
  onChanged,
}: {
  groupId: string;
  onChanged: () => void;
}) {
  const [name, setName] = useState("");
  const [delta, setDelta] = useState("");

  async function add() {
    if (!name.trim()) return;
    await addModifier({
      groupId,
      name: name.trim(),
      priceDeltaRupees: Number(delta || 0),
    });
    setName("");
    setDelta("");
    onChanged();
  }

  return (
    <div className="flex items-center gap-2 pt-1">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="New option (e.g. Extra Cheese)"
        className={inputCls + " flex-1"}
      />
      <div className="flex items-center gap-0.5">
        <span className="text-xs text-muted">Rs</span>
        <input
          value={delta}
          onChange={(e) => setDelta(e.target.value)}
          inputMode="decimal"
          placeholder="0.00"
          className={inputCls + " w-20"}
        />
      </div>
      <button onClick={add} disabled={!name.trim()} className="btn-primary px-3 py-2 text-sm disabled:opacity-40">
        +
      </button>
    </div>
  );
}

function AddGroupForm({
  itemId,
  onChanged,
}: {
  itemId: string;
  onChanged: () => void;
}) {
  const [name, setName] = useState("");
  const [min, setMin] = useState("0");
  const [max, setMax] = useState("1");
  const [req, setReq] = useState(false);

  async function add() {
    if (!name.trim()) return;
    await addModifierGroup({
      menuItemId: itemId,
      name: name.trim(),
      minSelect: Number(min),
      maxSelect: Number(max),
      required: req,
    });
    setName("");
    setMin("0");
    setMax("1");
    setReq(false);
    onChanged();
  }

  return (
    <div className="rounded-xl border border-dashed border-line p-3 space-y-2">
      <div className="text-xs uppercase tracking-widest text-muted">Add modifier group</div>
      <div className="flex flex-wrap gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Group name (e.g. Size)"
          className={inputCls + " flex-1 min-w-[140px]"}
        />
        <input
          value={min}
          onChange={(e) => setMin(e.target.value)}
          type="number"
          title="Min select"
          className={inputCls + " w-16"}
        />
        <span className="text-xs text-muted self-center">to</span>
        <input
          value={max}
          onChange={(e) => setMax(e.target.value)}
          type="number"
          title="Max select"
          className={inputCls + " w-16"}
        />
        <label className="flex items-center gap-1 text-xs text-muted">
          <input
            type="checkbox"
            checked={req}
            onChange={(e) => setReq(e.target.checked)}
          />
          Required
        </label>
        <button
          onClick={add}
          disabled={!name.trim()}
          className="btn-primary px-4 py-2 text-sm disabled:opacity-40"
        >
          Add group
        </button>
      </div>
    </div>
  );
}