import { slugify } from "../operations";
import { useMemo, useState } from "react";
import {
  ArrowUpRight,
  FolderTree,
  Pencil,
  Plus,
  Search,
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
  setProductActive,
} from "../services/adminApi";
import type {
  AdminCategory,
  AdminProduct,
  CategoryInput,
  ProductInput,
} from "../services/adminApi";
import {
  AdminConfirmDialog,
  AdminEmpty,
  AdminEditorPage,
  AdminError,
  AdminLoading,
  FieldHint,
  SectionHeader,
  useAsync,
} from "./ui";
import ImageInput from "./ImageInput";

type ProductForm = {
  expectedQuantity: number;
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
  expectedQuantity: 0,
  id: null,
  categoryId: "",
  slug: "",
  sku: "",
  name: "",
  origin: "",
  weightLabel: "",
  priceVnd: "0",
  imageUrl: "",
  tag: "",
  description: "",
  active: true,
  featured: false,
  sortOrder: "50",
  quantity: "0",
  lowStockThreshold: "5",
};

const toForm = (product: AdminProduct): ProductForm => ({
  expectedQuantity: product.quantity,
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

function CategoryManager({
  onClose,
  onChanged,
}: {
  onClose: () => void;
  onChanged: () => void;
}) {
  const { data, error, loading, reload } = useAsync(listAdminCategories, []);
  const [form, setForm] = useState<CategoryInput & { id: string | null }>({
    id: null,
    slug: "",
    name: "",
    sortOrder: 50,
  });
  const [actionError, setActionError] = useState("");
  const [busy, setBusy] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<AdminCategory | null>(null);

  const submit = async () => {
    if (!form.name.trim() || !form.slug.trim()) {
      setActionError("Tên và slug danh mục là bắt buộc.");
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
        await updateCategory(form.id, form);
      } else {
        await createCategory(form);
      }
      setForm({ id: null, slug: "", name: "", sortOrder: 50 });
      reload();
      onChanged();
    } catch (caught) {
      setActionError(
        caught instanceof Error ? caught.message : "Không lưu được danh mục.",
      );
    } finally {
      setBusy(false);
    }
  };

  const remove = async (category: AdminCategory) => {
    setBusy(true);
    setActionError("");
    try {
      await deleteCategory(category.id);
      setPendingDelete(null);
      reload();
      onChanged();
    } catch (caught) {
      setActionError(
        caught instanceof Error ? caught.message : "Không xóa được danh mục.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <AdminEditorPage title="Danh mục sản phẩm" section="Sản phẩm" mode="Danh mục" subtitle="Phân loại sản phẩm, đường dẫn và thứ tự hiển thị trên cửa hàng." onBack={onClose} footer={<button className="admin-ghost" onClick={onClose}>Về sản phẩm</button>}>
      <AdminError message={actionError} />
      {loading ? (
        <AdminLoading />
      ) : error ? (
        <AdminError message={error} />
      ) : (
        <ul className="admin-detail-list admin-category-list">
          {(data ?? []).map((category) => (
            <li key={category.id}>
              <span>
                {category.name}
                <small>
                  /{category.slug} · {category.productCount} sản phẩm
                  {category.productCount
                    ? ` · ${category.activeProductCount} đang bán`
                    : ""}
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
                  onClick={() => setPendingDelete(category)}
                  disabled={category.productCount > 0}
                  title={
                    category.productCount
                      ? "Chuyển sản phẩm sang danh mục khác trước khi xóa"
                      : "Xóa danh mục"
                  }
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
            required
            value={form.name}
            onChange={(event) =>
              setForm((current) => ({ ...current, name: event.target.value }))
            }
          />
        </label>
        <label>
          Slug (a-z, 0-9, gạch ngang)
          <input
            required
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
            min={0}
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
      {pendingDelete && (
        <AdminConfirmDialog
          title="Xóa danh mục trống"
          description={
            <>
              Xóa danh mục <b>“{pendingDelete.name}”</b>? Thao tác này không thể
              hoàn tác.
            </>
          }
          confirmLabel="Xóa danh mục"
          onConfirm={() => void remove(pendingDelete)}
          onClose={() => setPendingDelete(null)}
          busy={busy}
        />
      )}
    </AdminEditorPage>
  );
}

export default function ProductsSection() {
  const { data, error, loading, reload } = useAsync(listAdminProducts, []);
  const [form, setForm] = useState<ProductForm | null>(null);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<AdminProduct | null>(null);

  const {
    data: categories,
    error: categoriesError,
    loading: categoriesLoading,
    reload: reloadCategories,
  } = useAsync(listAdminCategories, []);
  const products = data ?? [];
  const lowStockCount = products.filter(
    (product) => product.quantity <= product.lowStockThreshold,
  ).length;
  const inventoryValue = products.reduce(
    (sum, product) => sum + product.quantity * product.priceVnd,
    0,
  );
  const visibleProducts = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return products.filter((product) => {
      if (categoryFilter !== "all" && product.categoryId !== categoryFilter) return false;
      return !needle || `${product.name} ${product.sku} ${product.slug}`.toLowerCase().includes(needle);
    });
  }, [categoryFilter, products, query]);

  const save = async () => {
    if (!form) return;
    if (!form.name.trim() || !form.sku.trim() || !form.slug.trim()) {
      setActionError("Tên, SKU và slug là bắt buộc.");
      return;
    }
    if (!form.categoryId) {
      setActionError("Hãy chọn danh mục cho sản phẩm.");
      return;
    }
    if (!form.imageUrl.trim()) {
      setActionError("Hãy chọn ảnh sản phẩm.");
      return;
    }
    if (!form.origin.trim() || !form.weightLabel.trim()) { setActionError("Cần xuất xứ và quy cách / khối lượng của sản phẩm."); return; }
    if (![form.priceVnd,form.quantity,form.lowStockThreshold,form.sortOrder].every(v=>v.trim()!=="" && Number.isSafeInteger(Number(v)) && Number(v)>=0)) { setActionError("Giá, tồn kho và thứ tự phải là số nguyên không âm."); return; }
    if (!/^[a-z0-9-]+$/.test(form.slug.trim())) {
      setActionError("Slug chỉ gồm chữ thường, số và dấu gạch ngang.");
      return;
    }
    setBusy(true);
    setActionError("");
    try {
      if (form.id) {
        await updateProduct(form.id, toInput(form), form.expectedQuantity);
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
      await setProductActive(product.id, !product.active);
      reload();
    } catch (caught) {
      setActionError(
        caught instanceof Error ? caught.message : "Không đổi được trạng thái.",
      );
    }
  };

  const remove = async (product: AdminProduct) => {
    setBusy(true);
    setActionError("");
    try {
      await deleteProduct(product.id);
      setNotice(`Đã xóa ${product.name}.`);
      setPendingDelete(null);
      reload();
    } catch (caught) {
      setActionError(
        caught instanceof Error ? caught.message : "Không xóa được sản phẩm.",
      );
    } finally {
      setBusy(false);
    }
  };

  if (categoriesOpen) return <CategoryManager onClose={()=>setCategoriesOpen(false)} onChanged={()=>{reload();reloadCategories();}} />;

  return (
    <>
      {!form && (
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
      <div className="metric-grid admin-list-metrics">
        <article><span>Tổng sản phẩm</span><strong>{products.length}</strong><small>Trong danh mục cửa hàng</small></article>
        <article><span>Đang bán</span><strong>{products.filter((product) => product.active).length}</strong><small>Hiển thị trên cửa hàng</small></article>
        <article><span>Sắp hết hàng</span><strong>{lowStockCount}</strong><small>Theo ngưỡng cảnh báo</small></article>
        <article><span>Đã ẩn</span><strong>{products.filter((product) => !product.active).length}</strong><small>Chưa hiển thị công khai</small></article>
        <article><span>Giá trị tồn kho</span><strong>{money(inventoryValue)}</strong><small>Theo giá bán hiện tại</small></article>
      </div>
      <div className="admin-card admin-filter-toolbar">
        <div className="admin-search">
          <Search size={16} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tìm tên sản phẩm, SKU…"
            aria-label="Tìm sản phẩm"
          />
        </div>
        <select
          className="admin-toolbar-select"
          value={categoryFilter}
          onChange={(event) => setCategoryFilter(event.target.value)}
          aria-label="Lọc theo danh mục"
        >
          <option value="all">Tất cả danh mục</option>
          {(categories ?? []).map((category) => (
            <option key={category.id} value={category.id}>{category.name}</option>
          ))}
        </select>
      </div>

      <section className="admin-card">
        <div className="admin-card-heading">
          <div>
            <h2>{visibleProducts.length} sản phẩm</h2>
            <p>Sản phẩm đang bật sẽ hiện trên cửa hàng.</p>
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
        ) : visibleProducts.length ? (
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
                {visibleProducts.map((product) => (
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
                          onClick={() => setPendingDelete(product)}
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
          <AdminEmpty>Không có sản phẩm phù hợp bộ lọc.</AdminEmpty>
        )}
      </section>
        </>
      )}

      {form && (
        <AdminEditorPage
          section="Sản phẩm"
          mode={form.id ? "Chỉnh sửa" : "Tạo mới"}
          title={form.id ? "Chỉnh sửa sản phẩm" : "Tạo sản phẩm mới"}
          subtitle="Thiết lập thông tin hiển thị, tồn kho và danh mục bán hàng."
          onBack={() => setForm(null)}
          aside={
            <>
              <section>
                <h2>Hình ảnh sản phẩm</h2>
                <ImageInput
                  value={form.imageUrl}
                  folder="products"
                  onChange={(imageUrl) => setForm({ ...form, imageUrl })}
                />
                <p>Ảnh được tối ưu và lưu trong thư viện của cửa hàng.</p>
              </section>
              <section>
                <h2>Cài đặt hiển thị</h2>
                <div className="admin-switch-list">
                  <label className="admin-switch-row">
                    <span>
                      <b>Đang bán</b>
                      <small>Hiển thị sản phẩm trên cửa hàng</small>
                    </span>
                    <input
                      type="checkbox"
                      checked={form.active}
                      onChange={(event) =>
                        setForm({ ...form, active: event.target.checked })
                      }
                    />
                  </label>
                  <label className="admin-switch-row">
                    <span>
                      <b>Sản phẩm nổi bật</b>
                      <small>Ưu tiên trong các khu vực giới thiệu</small>
                    </span>
                    <input
                      type="checkbox"
                      checked={form.featured}
                      onChange={(event) =>
                        setForm({ ...form, featured: event.target.checked })
                      }
                    />
                  </label>
                </div>
              </section>
            </>
          }
          footer={
            <>
              <button className="admin-ghost" onClick={() => setForm(null)}>
                Hủy
              </button>
              <button
                className="admin-primary"
                onClick={() => void save()}
                disabled={busy}
              >
                {busy ? "Đang lưu…" : form.id ? "Cập nhật sản phẩm" : "Tạo sản phẩm"}
              </button>
            </>
          }
        >
          <AdminError message={actionError} />
          <div className="admin-form-grid">
            <label>
              Tên sản phẩm
              <input
                required
                value={form.name}
                onChange={(event) =>
                  setForm({ ...form, name: event.target.value, slug: !form.id && (!form.slug || form.slug === slugify(form.name)) ? slugify(event.target.value) : form.slug })
                }
              />
            </label>
            <label>
              Slug (dùng cho URL và giỏ hàng)
              <input
                required
                value={form.slug}
                onChange={(event) =>
                  setForm({ ...form, slug: event.target.value })
                }
              />
            </label>
            <label>
              SKU
              <input
                required
                value={form.sku}
                onChange={(event) => setForm({ ...form, sku: event.target.value })}
              />
            </label>
            <label>
              Danh mục <span className="admin-required">*</span>
              <select
                required
                value={form.categoryId}
                onChange={(event) =>
                  setForm({ ...form, categoryId: event.target.value })
                }
              >
                <option value="">— Chọn danh mục —</option>
                {(categories ?? []).map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name} ({category.productCount} sản phẩm)
                  </option>
                ))}
              </select>
              {categoriesLoading ? (
                <FieldHint>Đang tải danh mục…</FieldHint>
              ) : categoriesError ? (
                <FieldHint>Chưa tải được danh mục. Hãy thử làm mới.</FieldHint>
              ) : (
                <FieldHint>Danh mục quyết định vị trí sản phẩm trên cửa hàng.</FieldHint>
              )}
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
          </div>
        </AdminEditorPage>
      )}

      {categoriesOpen && (
        <CategoryManager
          onClose={() => setCategoriesOpen(false)}
          onChanged={reloadCategories}
        />
      )}
      {pendingDelete && (
        <AdminConfirmDialog
          title="Xóa sản phẩm"
          description={
            <>
              Xóa <b>“{pendingDelete.name}”</b>? Sản phẩm sẽ được gỡ khỏi cửa
              hàng và tất cả chương trình khuyến mãi có liên quan.
            </>
          }
          confirmLabel="Xóa sản phẩm"
          onConfirm={() => void remove(pendingDelete)}
          onClose={() => setPendingDelete(null)}
          busy={busy}
        />
      )}
    </>
  );
}
