import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpRight, Pencil, Plus, Search, Trash2 } from "lucide-react";
import {
  createPromotion,
  deletePromotion,
  deletePromotionProduct,
  listAdminProducts,
  listAdminPromotions,
  savePromotionProduct,
  updatePromotion,
} from "../services/adminApi";
import type { AdminPromotion } from "../services/adminApi";
import {
  AdminConfirmDialog,
  AdminEmpty,
  AdminEditorPage,
  AdminError,
  AdminLoading,
  FieldHint,
  formatDate,
  SectionHeader,
  toDateTimeInput,
  fromDateTimeInput,
  useAsync,
} from "./ui";

const ACCENTS = [
  { value: "forest", label: "Rừng xanh" },
  { value: "honey", label: "Mật ong" },
  { value: "earth", label: "Đất ấm" },
] as const;

type RowForm = {
  productId: string;
  originalPriceVnd: string;
  discountPercent: string;
  displayLabel: string;
  displayEnding: string;
  accent: string;
  sortOrder: string;
};

type PromotionForm = {
  id: string | null;
  code: string;
  name: string;
  isActive: boolean;
  startsAt: string;
  endsAt: string;
  rows: RowForm[];
  originalRows: string[];
};

const emptyPromotion: PromotionForm = {
  id: null,
  code: "",
  name: "",
  isActive: true,
  startsAt: "",
  endsAt: "",
  rows: [],
  originalRows: [],
};

export default function PromotionsSection() {
  const { data, error, loading, reload } = useAsync(listAdminPromotions, []);
  const { data: products } = useAsync(listAdminProducts, []);
  const [form, setForm] = useState<PromotionForm | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<AdminPromotion | null>(null);
  const promotions = data ?? [];
  const now = Date.now();
  const upcomingCount = promotions.filter(
    (promotion) => promotion.startsAt && new Date(promotion.startsAt).getTime() > now,
  ).length;
  const endedCount = promotions.filter(
    (promotion) => promotion.endsAt && new Date(promotion.endsAt).getTime() <= now,
  ).length;
  const visiblePromotions = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return promotions.filter((promotion) => {
      if (statusFilter === "active" && !promotion.isActive) return false;
      if (statusFilter === "inactive" && promotion.isActive) return false;
      return !needle || `${promotion.code} ${promotion.name}`.toLowerCase().includes(needle);
    });
  }, [promotions, query, statusFilter]);

  const openEdit = (promotion: AdminPromotion) => {
    setActionError("");
    setForm({
      id: promotion.id,
      code: promotion.code,
      name: promotion.name,
      isActive: promotion.isActive,
      startsAt: toDateTimeInput(promotion.startsAt),
      endsAt: toDateTimeInput(promotion.endsAt),
      rows: promotion.products.map((item) => ({
        productId: item.productId,
        originalPriceVnd: String(item.originalPriceVnd),
        discountPercent: String(item.discountPercent),
        displayLabel: item.displayLabel,
        displayEnding: item.displayEnding,
        accent: item.accent,
        sortOrder: String(item.sortOrder),
      })),
      originalRows: promotion.products.map((item) => item.productId),
    });
  };

  const save = async () => {
    if (!form) return;
    if (!form.code.trim() || !form.name.trim()) {
      setActionError("Mã và tên khuyến mãi là bắt buộc.");
      return;
    }
    const rows = form.rows.filter((row) => row.productId);
    if (!rows.length || rows.length !== form.rows.length) {
      setActionError("Hãy chọn sản phẩm cho mọi dòng khuyến mãi.");
      return;
    }
    if (new Set(rows.map((row) => row.productId)).size !== rows.length) {
      setActionError("Mỗi sản phẩm chỉ được xuất hiện một lần trong cùng chương trình.");
      return;
    }
    if (
      rows.some(
        (row) =>
          Number(row.originalPriceVnd) <= 0 ||
          Number(row.discountPercent) < 1 ||
          Number(row.discountPercent) > 100,
      )
    ) {
      setActionError("Giá gốc phải lớn hơn 0 và mức giảm phải từ 1% đến 100%.");
      return;
    }
    const startsAt = fromDateTimeInput(form.startsAt);
    const endsAt = fromDateTimeInput(form.endsAt);
    if (startsAt && endsAt && new Date(endsAt) <= new Date(startsAt)) {
      setActionError("Thời gian kết thúc phải sau thời gian bắt đầu.");
      return;
    }
    setBusy(true);
    setActionError("");
    try {
      const payload = {
        code: form.code,
        name: form.name,
        isActive: form.isActive,
        startsAt,
        endsAt,
      };
      const promotionId = form.id ?? (await createPromotion(payload));
      if (form.id) await updatePromotion(form.id, payload);

      for (const productId of form.originalRows) {
        if (!rows.some((row) => row.productId === productId)) {
          await deletePromotionProduct(promotionId, productId);
        }
      }
      for (const [index, row] of rows.entries()) {
        await savePromotionProduct(promotionId, {
          productId: row.productId,
          originalPriceVnd: Number(row.originalPriceVnd) || 0,
          discountPercent: Number(row.discountPercent) || 1,
          displayLabel: row.displayLabel,
          displayEnding: row.displayEnding,
          accent: row.accent,
          sortOrder: (index + 1) * 10,
        });
      }
      setNotice(`Đã lưu khuyến mãi ${payload.code.toUpperCase()}.`);
      setForm(null);
      reload();
    } catch (caught) {
      setActionError(
        caught instanceof Error ? caught.message : "Không lưu được khuyến mãi.",
      );
    } finally {
      setBusy(false);
    }
  };

  const remove = async (promotion: AdminPromotion) => {
    setBusy(true);
    setActionError("");
    try {
      await deletePromotion(promotion.id);
      setNotice(`Đã xóa ${promotion.code}.`);
      setPendingDelete(null);
      reload();
    } catch (caught) {
      setActionError(
        caught instanceof Error ? caught.message : "Không xóa được khuyến mãi.",
      );
    } finally {
      setBusy(false);
    }
  };

  const changeProduct = (index: number, productId: string) => {
    if (!form) return;
    const product = (products ?? []).find((item) => item.id === productId);
    setForm({
      ...form,
      rows: form.rows.map((row, rowIndex) =>
        rowIndex === index
          ? {
              ...row,
              productId,
              originalPriceVnd: product ? String(product.priceVnd) : row.originalPriceVnd,
              displayLabel: product && !row.displayLabel ? product.tag : row.displayLabel,
            }
          : row,
      ),
    });
  };

  const moveRow = (from: number, to: number) => {
    if (!form || to < 0 || to >= form.rows.length) return;
    const rows = [...form.rows];
    [rows[from], rows[to]] = [rows[to], rows[from]];
    setForm({ ...form, rows });
  };

  return (
    <>
      {!form && (
        <>
      <SectionHeader
        eyebrow="ƯU ĐÃI & MÃ GIẢM"
        title="Khuyến mãi"
        action={
          <button
            className="admin-primary"
            onClick={() => setForm({ ...emptyPromotion, rows: [] })}
          >
            <Plus size={17} /> Tạo khuyến mãi
          </button>
        }
      />
      <div className="metric-grid admin-list-metrics">
        <article><span>Tổng chương trình</span><strong>{promotions.length}</strong><small>Đã tạo trong hệ thống</small></article>
        <article><span>Đang chạy</span><strong>{promotions.filter((item) => item.isActive).length}</strong><small>Đang bật hiển thị</small></article>
        <article><span>Sắp diễn ra</span><strong>{upcomingCount}</strong><small>Chưa đến thời gian áp dụng</small></article>
        <article><span>Đã kết thúc</span><strong>{endedCount}</strong><small>Đã qua ngày kết thúc</small></article>
        <article><span>Sản phẩm áp dụng</span><strong>{promotions.reduce((sum, item) => sum + item.products.length, 0)}</strong><small>Tổng dòng liên kết</small></article>
      </div>
      <div className="admin-card admin-filter-toolbar">
        <div className="admin-search">
          <Search size={16} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tìm tên hoặc mã khuyến mãi…"
            aria-label="Tìm khuyến mãi"
          />
        </div>
        <select
          className="admin-toolbar-select"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value as "all" | "active" | "inactive")}
          aria-label="Lọc trạng thái khuyến mãi"
        >
          <option value="all">Tất cả trạng thái</option>
          <option value="active">Đang bật</option>
          <option value="inactive">Đang tắt</option>
        </select>
      </div>

      <section className="admin-card">
        <div className="admin-card-heading">
          <div>
            <h2>{visiblePromotions.length} chương trình</h2>
            <p>Ưu đãi đang bật sẽ hiện ở mục Deal hời trên trang chủ.</p>
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
        ) : visiblePromotions.length ? (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Chương trình</th>
                  <th>Hiệu lực</th>
                  <th>Sản phẩm</th>
                  <th>Trạng thái</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {visiblePromotions.map((promotion) => (
                  <tr key={promotion.id}>
                    <td>
                      <b>{promotion.code}</b>
                      <small>{promotion.name}</small>
                    </td>
                    <td>
                      {formatDate(promotion.startsAt)} →{" "}
                      {formatDate(promotion.endsAt)}
                    </td>
                    <td>
                      {promotion.products.length} dòng
                      <small>
                        {promotion.products
                          .map((item) => item.productName)
                          .join(" · ") || "Chưa gán sản phẩm"}
                      </small>
                    </td>
                    <td>
                      <span
                        className={
                          promotion.isActive
                            ? "order-status status-paid"
                            : "order-status"
                        }
                      >
                        {promotion.isActive ? "Đang bật" : "Đang tắt"}
                      </span>
                    </td>
                    <td>
                      <div className="admin-row-actions">
                        <button
                          onClick={() => openEdit(promotion)}
                          aria-label={`Sửa ${promotion.code}`}
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          className="danger"
                          onClick={() => setPendingDelete(promotion)}
                          aria-label={`Xóa ${promotion.code}`}
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
          <AdminEmpty>Không có chương trình phù hợp bộ lọc.</AdminEmpty>
        )}
      </section>
        </>
      )}

      {form && (
        <AdminEditorPage
          section="Khuyến mãi"
          mode={form.id ? "Chỉnh sửa" : "Tạo mới"}
          title={form.id ? "Chỉnh sửa khuyến mãi" : "Tạo khuyến mãi mới"}
          subtitle="Thiết lập điều kiện ưu đãi và các sản phẩm áp dụng."
          onBack={() => setForm(null)}
          aside={
            <>
              <section>
                <h2>Cài đặt hiển thị</h2>
                <div className="admin-switch-list">
                  <label className="admin-switch-row">
                    <span>
                      <b>Bật chương trình</b>
                      <small>Chỉ ưu đãi đang bật mới xuất hiện trên cửa hàng</small>
                    </span>
                    <input
                      type="checkbox"
                      checked={form.isActive}
                      onChange={(event) =>
                        setForm({ ...form, isActive: event.target.checked })
                      }
                    />
                  </label>
                </div>
              </section>
              <section>
                <h2>Phạm vi áp dụng</h2>
                <p>
                  Chọn các sản phẩm cụ thể ở phần bên trái. Một sản phẩm chỉ có
                  thể xuất hiện một lần trong cùng chương trình.
                </p>
              </section>
            </>
          }
          footer={
            <>
              <button className="admin-ghost" onClick={() => setForm(null)}>
                Hủy
              </button>
              <button className="admin-primary" onClick={() => void save()} disabled={busy}>
                {busy ? "Đang lưu…" : form.id ? "Cập nhật khuyến mãi" : "Tạo khuyến mãi"}
              </button>
            </>
          }
        >
          <AdminError message={actionError} />
          <div className="admin-form-grid">
            <label>
              Mã chương trình
              <input
                value={form.code}
                onChange={(event) =>
                  setForm({ ...form, code: event.target.value })
                }
                placeholder="VUI-MUA-THU"
              />
            </label>
            <label>
              Tên hiển thị
              <input
                value={form.name}
                onChange={(event) =>
                  setForm({ ...form, name: event.target.value })
                }
              />
            </label>
            <label>
              Bắt đầu
              <input
                type="datetime-local"
                value={form.startsAt}
                onChange={(event) =>
                  setForm({ ...form, startsAt: event.target.value })
                }
              />
            </label>
            <label>
              Kết thúc (để trống nếu không giới hạn)
              <input
                type="datetime-local"
                value={form.endsAt}
                onChange={(event) =>
                  setForm({ ...form, endsAt: event.target.value })
                }
              />
            </label>
          </div>

          <h3 className="admin-subheading">Sản phẩm trong chương trình</h3>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Sản phẩm</th>
                  <th>Giá gốc</th>
                  <th>Giảm %</th>
                  <th>Nhãn</th>
                  <th>Dòng trạng thái</th>
                  <th>Tông màu</th>
                  <th>Vị trí</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {form.rows.map((row, index) => (
                  <tr key={`${row.productId}-${index}`}>
                    <td>
                      <select
                        value={row.productId}
                        onChange={(event) => changeProduct(index, event.target.value)}
                      >
                        <option value="">— Chọn sản phẩm —</option>
                        {(products ?? []).map((product) => (
                          <option
                            key={product.id}
                            value={product.id}
                            disabled={
                              (!product.active && row.productId !== product.id) ||
                              form.rows.some(
                                (item, itemIndex) =>
                                  itemIndex !== index && item.productId === product.id,
                              )
                            }
                          >
                            {product.name} · {product.categoryName}
                            {!product.active ? " (đã ẩn)" : ""}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        type="number"
                        min={0}
                        value={row.originalPriceVnd}
                        onChange={(event) =>
                          setForm({
                            ...form,
                            rows: form.rows.map((item, itemIndex) =>
                              itemIndex === index
                                ? { ...item, originalPriceVnd: event.target.value }
                                : item,
                            ),
                          })
                        }
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        min={1}
                        max={100}
                        value={row.discountPercent}
                        onChange={(event) =>
                          setForm({
                            ...form,
                            rows: form.rows.map((item, itemIndex) =>
                              itemIndex === index
                                ? { ...item, discountPercent: event.target.value }
                                : item,
                            ),
                          })
                        }
                      />
                    </td>
                    <td>
                      <input
                        value={row.displayLabel}
                        onChange={(event) =>
                          setForm({
                            ...form,
                            rows: form.rows.map((item, itemIndex) =>
                              itemIndex === index
                                ? { ...item, displayLabel: event.target.value }
                                : item,
                            ),
                          })
                        }
                      />
                    </td>
                    <td>
                      <input
                        value={row.displayEnding}
                        onChange={(event) =>
                          setForm({
                            ...form,
                            rows: form.rows.map((item, itemIndex) =>
                              itemIndex === index
                                ? { ...item, displayEnding: event.target.value }
                                : item,
                            ),
                          })
                        }
                      />
                    </td>
                    <td>
                      <select
                        value={row.accent}
                        onChange={(event) =>
                          setForm({
                            ...form,
                            rows: form.rows.map((item, itemIndex) =>
                              itemIndex === index
                                ? { ...item, accent: event.target.value }
                                : item,
                            ),
                          })
                        }
                      >
                        {ACCENTS.map((accent) => (
                          <option key={accent.value} value={accent.value}>
                            {accent.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <div className="admin-row-actions">
                        <button
                          type="button"
                          onClick={() => moveRow(index, index - 1)}
                          disabled={index === 0}
                          aria-label="Đưa sản phẩm lên trên"
                        >
                          <ArrowUp size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveRow(index, index + 1)}
                          disabled={index === form.rows.length - 1}
                          aria-label="Đưa sản phẩm xuống dưới"
                        >
                          <ArrowDown size={14} />
                        </button>
                      </div>
                    </td>
                    <td>
                      <button
                        className="danger"
                        onClick={() =>
                          setForm({
                            ...form,
                            rows: form.rows.filter(
                              (_item, itemIndex) => itemIndex !== index,
                            ),
                          })
                        }
                        aria-label="Xóa dòng"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            className="admin-ghost"
            onClick={() =>
              setForm({
                ...form,
                rows: [
                  ...form.rows,
                  {
                    productId: "",
                    originalPriceVnd: "0",
                    discountPercent: "10",
                    displayLabel: "",
                    displayEnding: "Số lượng có hạn",
                    accent: "forest",
                    sortOrder: String((form.rows.length + 1) * 10),
                  },
                ],
              })
            }
          >
            <Plus size={15} /> Thêm dòng sản phẩm
          </button>
          <FieldHint>
            Chọn mỗi sản phẩm một lần. Giá hiện tại của sản phẩm sẽ được điền
            sẵn làm giá gốc; có thể điều chỉnh khi cần hiển thị mức giảm.
          </FieldHint>

        </AdminEditorPage>
      )}
      {pendingDelete && (
        <AdminConfirmDialog
          title="Xóa chương trình khuyến mãi"
          description={
            <>
              Xóa <b>{pendingDelete.code}</b>? Toàn bộ liên kết sản phẩm trong
              chương trình này cũng sẽ bị xóa.
            </>
          }
          confirmLabel="Xóa chương trình"
          onConfirm={() => void remove(pendingDelete)}
          onClose={() => setPendingDelete(null)}
          busy={busy}
        />
      )}
    </>
  );
}
