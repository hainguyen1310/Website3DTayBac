import { useState } from "react";
import {
  ArrowUpRight,
  FolderTree,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { money } from "../catalog";
import {
  createCategory,
  createProduct,
  deleteCategory,
  deleteProduct,
  listAdminCategories,
  listAdminProducts,
  updateCategory,
  updateProduct,
} from "../services/adminApi";
import type {
  AdminCategory,
  AdminProduct,
  CategoryInput,
  ProductInput,
} from "../services/adminApi";
import {
  AdminEmpty,
  AdminError,
  AdminLoading,
  AdminModal,
  SectionHeader,
  useAsync,
} from "./ui";

type ProductForm = {
  id: string | null;
  categoryId: string;
  slug: string;
  sku: string;
  name: string;
  origin: string;
  weightLabel: string;
  priceVnd: string;
  imageUrl: string;
  tag: string;
  description: string;
  active: boolean;
  featured: boolean;
  sortOrder: string;
  quantity: string;
  lowStockThreshold: string;
};

const emptyForm: ProductForm = {
  id: null,
  categoryId: "",
  slug: "",
  sku: "",
  name: "",
  origin: "",
  weightLabel: "",
  priceVnd: "0",
  imageUrl: "/images/tea.webp",
  tag: "",
  description: "",
  active: true,
  featured: false,
  sortOrder: "50",
  quantity: "0",
  lowStockThreshold: "5",
};

const toForm = (product: AdminProduct): ProductForm => ({
  id: product.id,
  categoryId: product.categoryId ?? "",
  slug: product.slug,
  sku: product.sku,
  name: product.name,
  origin: product.origin,
  weightLabel: product.weightLabel,
  priceVnd: String(product.priceVnd),
  imageUrl: product.imageUrl,
  tag: product.tag,
  description: product.description,
  active: product.active,
  featured: product.featured,
  sortOrder: String(product.sortOrder),
  quantity: String(product.quantity),
  lowStockThreshold: String(product.lowStockThreshold),
});

const toInput = (form: ProductForm): ProductInput => ({
  categoryId: form.categoryId || null,
  slug: form.slug.trim(),
  sku: form.sku.trim(),
  name: form.name.trim(),
  origin: form.origin.trim(),
  weightLabel: form.weightLabel.trim(),
  priceVnd: Number(form.priceVnd) || 0,
  imageUrl: form.imageUrl.trim(),
  tag: form.tag.trim(),
  description: form.description.trim(),
  active: form.active,
  featured: form.featured,
  sortOrder: Number(form.sortOrder) || 0,
  quantity: Number(form.quantity) || 0,
  lowStockThreshold: Number(form.lowStockThreshold) || 0,
});

function CategoryManager({ onClose }: { onClose: () => void }) {
  const { data, error, loading, reload } = useAsync(listAdminCategories, []);
  const [form, setForm] = useState<CategoryInput & { id: string | null }>({
    id: null,
    slug: "",
    name: "",
    sortOrder: 50,
  });
  const [actionError, setActionError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    setActionError("");
    try {
      if (form.id) {
        await updateCategory(form.id, form);
      } else {
        await createCategory(form);
      }
      setForm({ id: null, slug: "", name: "", sortOrder: 50 });
      reload();
    } catch (caught) {
      setActionError(
        caught instanceof Error ? caught.message : "Không lưu được danh mục.",
      );
    } finally {
      setBusy(false);
    }
  };

  const remove = async (category: AdminCategory) => {
    if (
      !window.confirm(
        `Xóa danh mục “${category.name}”? Sản phẩm thuộc danh mục này sẽ chuyển thành chưa phân loại.`,
      )
    )
      return;
    setActionError("");
    try {
      await deleteCategory(category.id);
      reload();
    } catch (caught) {
      setActionError(
        caught instanceof Error ? caught.message : "Không xóa được danh mục.",
      );
    }
  };

  return (
    <AdminModal title="Danh mục sản phẩm" onClose={onClose}>
      <AdminError message={actionError} />
      {loading ? (
        <AdminLoading />
      ) : error ? (
        <AdminError message={error} />
      ) : (
        <ul className="admin-detail-list">
          {(data ?? []).map((category) => (
            <li key={category.id}>
              <span>
                {category.name}
                <small>
                  /{category.slug} · thứ tự {category.sortOrder}
                </small>
              </span>
              <div className="admin-row-actions">
                <button
                  onClick={() =>
                    setForm({
                      id: category.id,
                      slug: category.slug,
                      name: category.name,
                      sortOrder: category.sortOrder,
                    })
                  }
                  aria-label={`Sửa ${category.name}`}
                >
                  <Pencil size={14} />
                </button>
                <button
                  className="danger"
                  onClick={() => void remove(category)}
                  aria-label={`Xóa ${category.name}`}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <div className="admin-form-grid">
        <label>
          Tên danh mục
          <input
            value={form.name}
            onChange={(event) =>
              setForm((current) => ({ ...current, name: event.target.value }))
            }
          />
        </label>
        <label>
          Slug (a-z, 0-9, gạch ngang)
          <input
            value={form.slug}
            onChange={(event) =>
              setForm((current) => ({ ...current, slug: event.target.value }))
            }
          />
        </label>
        <label>
          Thứ tự hiển thị
          <input
            type="number"
            value={form.sortOrder}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                sortOrder: Number(event.target.value) || 0,
              }))
            }
          />
        </label>
      </div>
      <div className="admin-modal-actions">
        <button className="admin-primary" onClick={() => void submit()} disabled={busy}>
          <Plus size={15} /> {form.id ? "Cập nhật danh mục" : "Thêm danh mục"}
        </button>
        {form.id && (
          <button
            className="admin-ghost"
            onClick={() =>
              setForm({ id: null, slug: "", name: "", sortOrder: 50 })
            }
          >
            Hủy sửa
          </button>
        )}
      </div>
    </AdminModal>
  );
}

export default function ProductsSection() {
  const { data, error, loading, reload } = useAsync(listAdminProducts, []);
  const [form, setForm] = useState<ProductForm | null>(null);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const { data: categories } = useAsync(listAdminCategories, []);

  const save = async () => {
    if (!form) return;
    if (!form.name.trim() || !form.sku.trim() || !form.slug.trim()) {
      setActionError("Tên, SKU và slug là bắt buộc.");
      return;
    }
    if (!/^[a-z0-9-]+$/.test(form.slug.trim())) {
      setActionError("Slug chỉ gồm chữ thường, số và dấu gạch ngang.");
      return;
    }
    setBusy(true);
    setActionError("");
    try {
      if (form.id) {
        await updateProduct(form.id, toInput(form));
        setNotice(`Đã cập nhật ${form.name}.`);
      } else {
        await createProduct(toInput(form));
        setNotice(`Đã thêm ${form.name}.`);
      }
      setForm(null);
      reload();
    } catch (caught) {
      setActionError(
        caught instanceof Error ? caught.message : "Không lưu được sản phẩm.",
      );
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async (product: AdminProduct) => {
    setActionError("");
    try {
      await updateProduct(product.id, {
        categoryId: product.categoryId,
        slug: product.slug,
        sku: product.sku,
        name: product.name,
        origin: product.origin,
        weightLabel: product.weightLabel,
        priceVnd: product.priceVnd,
        imageUrl: product.imageUrl,
        tag: product.tag,
        description: product.description,
        active: !product.active,
        featured: product.featured,
        sortOrder: product.sortOrder,
        quantity: product.quantity,
        lowStockThreshold: product.lowStockThreshold,
      });
      reload();
    } catch (caught) {
      setActionError(
        caught instanceof Error ? caught.message : "Không đổi được trạng thái.",
      );
    }
  };

  const remove = async (product: AdminProduct) => {
    if (
      !window.confirm(
        `Xóa “${product.name}”? Sản phẩm sẽ bị gỡ khỏi cửa hàng và mọi khuyến mãi.`,
      )
    )
      return;
    setActionError("");
    try {
      await deleteProduct(product.id);
      setNotice(`Đã xóa ${product.name}.`);
      reload();
    } catch (caught) {
      setActionError(
        caught instanceof Error ? caught.message : "Không xóa được sản phẩm.",
      );
    }
  };

  return (
    <>
      <SectionHeader
        eyebrow="DANH MỤC BÁN HÀNG"
        title="Sản phẩm & tồn kho"
        action={
          <div className="admin-header-actions">
            <button
              className="admin-ghost"
              onClick={() => setCategoriesOpen(true)}
            >
              <FolderTree size={16} /> Danh mục
            </button>
            <button
              className="admin-primary"
              onClick={() => setForm({ ...emptyForm })}
            >
              <Plus size={17} /> Thêm sản phẩm
            </button>
          </div>
        }
      />

      <section className="admin-card">
        <div className="admin-card-heading">
          <div>
            <h2>{data?.length ?? 0} sản phẩm</h2>
            <p>
              Cửa hàng chỉ hiển thị sản phẩm đang bật. Tồn kho lưu trong
              product_inventory.
            </p>
          </div>
          <button onClick={reload}>
            Làm mới <ArrowUpRight size={15} />
          </button>
        </div>

        <AdminError message={actionError} />
        {notice && <p className="admin-alert ok">{notice}</p>}

        {loading ? (
          <AdminLoading />
        ) : error ? (
          <AdminError message={error} />
        ) : data?.length ? (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Sản phẩm</th>
                  <th>Danh mục</th>
                  <th>Giá</th>
                  <th>Tồn kho</th>
                  <th>Hiển thị</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data.map((product) => (
                  <tr key={product.id}>
                    <td>
                      <div className="admin-product-cell">
                        <img src={product.imageUrl} alt="" />
                        <span>
                          <b>{product.name}</b>
                          <small>
                            {product.sku} · /{product.slug}
                          </small>
                        </span>
                      </div>
                    </td>
                    <td>
                      {product.categoryName}
                      <small>{product.featured ? "Nổi bật" : ""}</small>
                    </td>
                    <td>
                      <b>{money(product.priceVnd)}</b>
                    </td>
                    <td>
                      <span
                        className={
                          product.quantity <= product.lowStockThreshold
                            ? "stock low"
                            : "stock"
                        }
                      >
                        <i
                          className={
                            product.quantity <= product.lowStockThreshold
                              ? "low"
                              : ""
                          }
                        />
                        {product.quantity} còn lại
                      </span>
                      <small>Ngưỡng {product.lowStockThreshold}</small>
                    </td>
                    <td>
                      <button
                        className={
                          product.active
                            ? "admin-toggle active"
                            : "admin-toggle"
                        }
                        onClick={() => void toggleActive(product)}
                        aria-pressed={product.active}
                      >
                        {product.active ? "Đang bán" : "Đã ẩn"}
                      </button>
                    </td>
                    <td>
                      <div className="admin-row-actions">
                        <button
                          onClick={() => setForm(toForm(product))}
                          aria-label={`Sửa ${product.name}`}
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          className="danger"
                          onClick={() => void remove(product)}
                          aria-label={`Xóa ${product.name}`}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <AdminEmpty>Chưa có sản phẩm nào trong cơ sở dữ liệu.</AdminEmpty>
        )}
      </section>

      {form && (
        <AdminModal
          title={form.id ? `Sửa: ${form.name}` : "Thêm sản phẩm"}
          onClose={() => setForm(null)}
          wide
        >
          <AdminError message={actionError} />
          <div className="admin-form-grid">
            <label>
              Tên sản phẩm
              <input
                value={form.name}
                onChange={(event) =>
                  setForm({ ...form, name: event.target.value })
                }
              />
            </label>
            <label>
              Slug (dùng cho URL và giỏ hàng)
              <input
                value={form.slug}
                onChange={(event) =>
                  setForm({ ...form, slug: event.target.value })
                }
              />
            </label>
            <label>
              SKU
              <input
                value={form.sku}
                onChange={(event) => setForm({ ...form, sku: event.target.value })}
              />
            </label>
            <label>
              Danh mục
              <select
                value={form.categoryId}
                onChange={(event) =>
                  setForm({ ...form, categoryId: event.target.value })
                }
              >
                <option value="">— Chưa phân loại —</option>
                {(categories ?? []).map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Xuất xứ
              <input
                value={form.origin}
                onChange={(event) =>
                  setForm({ ...form, origin: event.target.value })
                }
                placeholder="MÙ CANG CHẢI"
              />
            </label>
            <label>
              Quy cách
              <input
                value={form.weightLabel}
                onChange={(event) =>
                  setForm({ ...form, weightLabel: event.target.value })
                }
                placeholder="Hũ 500ml"
              />
            </label>
            <label>
              Giá bán (VND)
              <input
                type="number"
                min={0}
                value={form.priceVnd}
                onChange={(event) =>
                  setForm({ ...form, priceVnd: event.target.value })
                }
              />
            </label>
            <label>
              Ảnh (đường dẫn)
              <input
                value={form.imageUrl}
                onChange={(event) =>
                  setForm({ ...form, imageUrl: event.target.value })
                }
                placeholder="/images/tea.webp"
              />
            </label>
            <label>
              Nhãn ngắn
              <input
                value={form.tag}
                onChange={(event) => setForm({ ...form, tag: event.target.value })}
              />
            </label>
            <label>
              Thứ tự hiển thị
              <input
                type="number"
                value={form.sortOrder}
                onChange={(event) =>
                  setForm({ ...form, sortOrder: event.target.value })
                }
              />
            </label>
            <label>
              Tồn kho
              <input
                type="number"
                min={0}
                value={form.quantity}
                onChange={(event) =>
                  setForm({ ...form, quantity: event.target.value })
                }
              />
            </label>
            <label>
              Ngưỡng cảnh báo tồn
              <input
                type="number"
                min={0}
                value={form.lowStockThreshold}
                onChange={(event) =>
                  setForm({ ...form, lowStockThreshold: event.target.value })
                }
              />
            </label>
            <label className="full">
              Mô tả
              <textarea
                rows={3}
                value={form.description}
                onChange={(event) =>
                  setForm({ ...form, description: event.target.value })
                }
              />
            </label>
            <label className="admin-check">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(event) =>
                  setForm({ ...form, active: event.target.checked })
                }
              />
              Đang bán (hiện trên cửa hàng)
            </label>
            <label className="admin-check">
              <input
                type="checkbox"
                checked={form.featured}
                onChange={(event) =>
                  setForm({ ...form, featured: event.target.checked })
                }
              />
              Đánh dấu nổi bật
            </label>
          </div>
          <div className="admin-modal-actions">
            <button
              className="admin-primary"
              onClick={() => void save()}
              disabled={busy}
            >
              {busy ? "Đang lưu…" : form.id ? "Cập nhật" : "Tạo sản phẩm"}
            </button>
            <button className="admin-ghost" onClick={() => setForm(null)}>
              Hủy
            </button>
          </div>
        </AdminModal>
      )}

      {categoriesOpen && (
        <CategoryManager onClose={() => setCategoriesOpen(false)} />
      )}
    </>
  );
}
