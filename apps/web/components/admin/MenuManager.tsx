"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Station } from "@/lib/types";
import { formatPaisa } from "@/lib/money";
import {
  createCategory,
  deleteCategory,
  updateCategory,
  createItem,
  updateItem,
  deleteItem,
  addModifierGroup,
  addModifier,
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
  "w-full bg-panel-2 border border-line rounded-lg px-3 py-2 outline-none focus:border-electric text-sm";

export function MenuManager({
  categories,
  stations,
}: {
  categories: CategoryDTO[];
  stations: Station[];
}) {
  const router = useRouter();
  const refresh = () => router.refresh();

  const [catName, setCatName] = useState("");
  const [itemCat, setItemCat] = useState(categories[0]?.id ?? "");
  const [itemName, setItemName] = useState("");
  const [itemPrice, setItemPrice] = useState("");
  const [itemStation, setItemStation] = useState<Station>("MAIN");
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [editItem, setEditItem] = useState<string | null>(null);

  async function onAddCategory() {
    if (!catName.trim()) return;
    await createCategory(catName.trim(), slugify(catName));
    setCatName("");
    refresh();
  }

  async function onAddItem() {
    if (!itemName.trim() || !itemCat || !itemPrice) return;
    await createItem({
      name: itemName.trim(),
      priceRupees: Number(itemPrice),
      categoryId: itemCat,
      station: itemStation,
    });
    setItemName("");
    setItemPrice("");
    refresh();
  }

  return (
    <div className="space-y-6">
      {/* Add category + add item */}
      <div className="card p-4 grid gap-4 sm:grid-cols-2">
        <div>
          <div className="text-xs uppercase tracking-widest text-muted mb-2">
            New Category
          </div>
          <div className="flex gap-2">
            <input
              value={catName}
              onChange={(e) => setCatName(e.target.value)}
              placeholder="e.g. Starters"
              className={inputCls}
            />
            <button onClick={onAddCategory} className="btn-primary px-4">
              Add
            </button>
          </div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-widest text-muted mb-2">
            New Item
          </div>
          <div className="flex flex-wrap gap-2">
            <input
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              placeholder="Name"
              className={inputCls + " flex-1 min-w-[120px]"}
            />
            <input
              value={itemPrice}
              onChange={(e) => setItemPrice(e.target.value)}
              placeholder="Rs"
              inputMode="decimal"
              className={inputCls + " w-24"}
            />
            <select
              value={itemCat}
              onChange={(e) => setItemCat(e.target.value)}
              className={inputCls + " w-32"}
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <select
              value={itemStation}
              onChange={(e) => setItemStation(e.target.value as Station)}
              className={inputCls + " w-28"}
            >
              {stations.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <button onClick={onAddItem} className="btn-primary px-4">
              Add
            </button>
          </div>
        </div>
      </div>

      {/* Categories */}
      {categories.map((cat) => (
        <div key={cat.id} className="card p-4">
          <div className="flex items-center justify-between mb-3 gap-3">
            <div className="flex items-center gap-3">
              <ImageField
                label=""
                compact
                value={cat.imageUrl ?? ""}
                onUploaded={async (u) => {
                  await updateCategory(cat.id, { imageUrl: u || null });
                  refresh();
                }}
              />
              <h2 className="text-lg font-bold">{cat.name}</h2>
            </div>
            <button
              onClick={async () => {
                if (confirm(`Delete category "${cat.name}"?`)) {
                  await deleteCategory(cat.id);
                  refresh();
                }
              }}
              className="text-xs text-muted hover:text-pink-400"
            >
              Delete category
            </button>
          </div>

          <div className="space-y-2">
            {cat.items.length === 0 ? (
              <div className="text-sm text-muted">No items yet.</div>
            ) : null}
            {cat.items.map((item) => (
              <div key={item.id} className="border border-line rounded-lg p-3">
                {editItem === item.id ? (
                  <EditItemForm
                    item={item}
                    stations={stations}
                    onDone={() => {
                      setEditItem(null);
                      refresh();
                    }}
                  />
                ) : (
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{item.name}</div>
                      <div className="text-xs text-muted">
                        {formatPaisa(item.price)} · {item.printerStation}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <label className="text-xs text-muted flex items-center gap-1">
                        <input
                          type="checkbox"
                          checked={item.available}
                          onChange={async (e) => {
                            await updateItem(item.id, {
                              available: e.target.checked,
                            });
                            refresh();
                          }}
                        />
                        Live
                      </label>
                      <button
                        onClick={() =>
                          setExpandedItem(
                            expandedItem === item.id ? null : item.id
                          )
                        }
                        className="text-xs px-2 py-1 rounded-lg border border-line hover:border-electric/50"
                      >
                        Mods ({item.modifierGroups.length})
                      </button>
                      <button
                        onClick={() => setEditItem(item.id)}
                        className="text-xs px-2 py-1 rounded-lg border border-line hover:border-electric/50"
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
                        className="text-xs text-muted hover:text-pink-400"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                )}

                {expandedItem === item.id && editItem !== item.id ? (
                  <ItemModifiers
                    item={item}
                    onDone={refresh}
                  />
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function EditItemForm({
  item,
  stations,
  onDone,
}: {
  item: ItemDTO;
  stations: Station[];
  onDone: () => void;
}) {
  const [name, setName] = useState(item.name);
  const [price, setPrice] = useState((item.price / 100).toString());
  const [station, setStation] = useState<Station>(item.printerStation);
  const [description, setDescription] = useState(item.description ?? "");
  const [imageUrl, setImageUrl] = useState(item.imageUrl ?? "");

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={inputCls + " flex-1"}
        />
        <input
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          inputMode="decimal"
          className={inputCls + " w-24"}
        />
        <select
          value={station}
          onChange={(e) => setStation(e.target.value as Station)}
          className={inputCls + " w-28"}
        >
          {stations.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
      <input
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description"
        className={inputCls}
      />
      <ImageField
        label="Item image"
        value={imageUrl}
        onUploaded={(u) => setImageUrl(u)}
      />
      <div className="flex gap-2">
        <button
          onClick={async () => {
            await updateItem(item.id, {
              name,
              priceRupees: Number(price),
              station,
              description,
              imageUrl: imageUrl || null,
            });
            onDone();
          }}
          className="btn-primary px-4 py-1.5 text-sm"
        >
          Save
        </button>
        <button
          onClick={() => onDone()}
          className="text-sm text-muted px-3 py-1.5"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function ItemModifiers({
  item,
  onDone,
}: {
  item: ItemDTO;
  onDone: () => void;
}) {
  const [groupName, setGroupName] = useState("");
  const [min, setMin] = useState("0");
  const [max, setMax] = useState("1");
  const [req, setReq] = useState(false);
  const [modName, setModName] = useState<Record<string, string>>({});
  const [modDelta, setModDelta] = useState<Record<string, string>>({});

  return (
    <div className="mt-3 pt-3 border-t border-line space-y-3">
      {item.modifierGroups.map((g) => (
        <div key={g.id} className="rounded-lg bg-panel-2 p-2">
          <div className="flex items-center justify-between text-sm font-semibold">
            <span>
              {g.name}{" "}
              <span className="text-muted font-normal text-xs">
                ({g.minSelect}-{g.maxSelect}
                {g.required ? ", required" : ""})
              </span>
            </span>
          </div>
          <div className="text-xs text-muted mt-1 space-y-0.5">
            {g.modifiers.map((m) => (
              <div key={m.id} className="flex items-center justify-between">
                <span>
                  {m.name}{" "}
                  {m.priceDelta !== 0 ? `(${formatPaisa(m.priceDelta)})` : ""}
                </span>
                <button
                  onClick={async () => {
                    await deleteModifier(m.id);
                    onDone();
                  }}
                  className="text-muted hover:text-pink-400"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-2">
            <input
              value={modName[g.id] ?? ""}
              onChange={(e) =>
                setModName((s) => ({ ...s, [g.id]: e.target.value }))
              }
              placeholder="Modifier name"
              className={inputCls + " flex-1"}
            />
            <input
              value={modDelta[g.id] ?? ""}
              onChange={(e) =>
                setModDelta((s) => ({ ...s, [g.id]: e.target.value }))
              }
              placeholder="Rs Δ"
              inputMode="decimal"
              className={inputCls + " w-20"}
            />
            <button
              onClick={async () => {
                const n = modName[g.id]?.trim();
                if (!n) return;
                await addModifier({
                  groupId: g.id,
                  name: n,
                  priceDeltaRupees: Number(modDelta[g.id] || 0),
                });
                setModName((s) => ({ ...s, [g.id]: "" }));
                setModDelta((s) => ({ ...s, [g.id]: "" }));
                onDone();
              }}
              className="btn-primary px-3 text-sm"
            >
              +
            </button>
          </div>
        </div>
      ))}

      <div className="rounded-lg border border-dashed border-line p-2">
        <div className="text-xs uppercase tracking-widest text-muted mb-2">
          Add modifier group
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="Group name"
            className={inputCls + " flex-1 min-w-[120px]"}
          />
          <input
            value={min}
            onChange={(e) => setMin(e.target.value)}
            type="number"
            className={inputCls + " w-16"}
            title="Min select"
          />
          <input
            value={max}
            onChange={(e) => setMax(e.target.value)}
            type="number"
            className={inputCls + " w-16"}
            title="Max select"
          />
          <label className="text-xs text-muted flex items-center gap-1">
            <input
              type="checkbox"
              checked={req}
              onChange={(e) => setReq(e.target.checked)}
            />
            Req
          </label>
          <button
            onClick={async () => {
              if (!groupName.trim()) return;
              await addModifierGroup({
                menuItemId: item.id,
                name: groupName.trim(),
                minSelect: Number(min),
                maxSelect: Number(max),
                required: req,
              });
              setGroupName("");
              onDone();
            }}
            className="btn-primary px-3 text-sm"
          >
            Add group
          </button>
        </div>
      </div>
    </div>
  );
}
