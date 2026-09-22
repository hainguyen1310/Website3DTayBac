import { useState } from "react";
import { ArrowUpRight, Pencil, Plus, Trash2 } from "lucide-react";
import { money } from "../catalog";
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
  AdminEmpty,
  AdminError,
  AdminLoading,
  AdminModal,
  formatDate,
  SectionHeader,
  toDateTimeInput,
  fromDateTimeInput,
  useAsync,
} from "./ui";

const ACCENTS = ["forest", "honey", "earth"];

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
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

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
    if (rows.some((row) => Number(row.discountPercent) < 1)) {
      setActionError("Mức giảm phải từ 1% trở lên.");
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
      for (const row of rows) {
        await savePromotionProduct(promotionId, {
          productId: row.productId,
          originalPriceVnd: Number(row.originalPriceVnd) || 0,
          discountPercent: Number(row.discountPercent) || 1,
          displayLabel: row.displayLabel,
          displayEnding: row.displayEnding,
          accent: row.accent,
          sortOrder: Number(row.sortOrder) || 0,
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
    if (
      !window.confirm(
        `Xóa khuyến mãi ${promotion.code}? Toàn bộ dòng sản phẩm của chương trình cũng bị xóa.`,
      )
    )
      return;
    setActionError("");
    try {
      await deletePromotion(promotion.id);
      setNotice(`Đã xóa ${promotion.code}.`);
      reload();
    } catch (caught) {
      setActionError(
        caught instanceof Error ? caught.message : "Không xóa được khuyến mãi.",
      );
    }
  };

  return (
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

      <section className="admin-card">
        <div className="admin-card-heading">
          <div>
            <h2>{data?.length ?? 0} chương trình</h2>
            <p>
              Ưu đãi đang bật và trong thời gian hiệu lực sẽ tự hiện ở mục Deal
              hời trên trang chủ.
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
                  <th>Chương trình</th>
                  <th>Hiệu lực</th>
                  <th>Sản phẩm</th>
                  <th>Trạng thái</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data.map((promotion) => (
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
                          onClick={() => void remove(promotion)}
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
          <AdminEmpty>Chưa có chương trình khuyến mãi nào.</AdminEmpty>
        )}
      </section>

      {form && (
        <AdminModal
          title={form.id ? `Sửa khuyến mãi ${form.code}` : "Tạo khuyến mãi"}
          onClose={() => setForm(null)}
          wide
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
            <label className="admin-check">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(event) =>
                  setForm({ ...form, isActive: event.target.checked })
                }
              />
              Bật chương trình
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
                  <th>Đếm ngược</th>
                  <th>Màu</th>
                  <th>Thứ tự</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {form.rows.map((row, index) => (
                  <tr key={`${row.productId}-${index}`}>
                    <td>
                      <select
                        value={row.productId}
                        onChange={(event) =>
                          setForm({
                            ...form,
                            rows: form.rows.map((item, itemIndex) =>
                              itemIndex === index
                                ? { ...item, productId: event.target.value }
                                : item,
                            ),
                          })
                        }
                      >
                        <option value="">— Chọn sản phẩm —</option>
                        {(products ?? []).map((product) => (
                          <option key={product.id} value={product.id}>
                            {product.name}
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
                          <option key={accent} value={accent}>
                            {accent}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        type="number"
                        value={row.sortOrder}
                        onChange={(event) =>
                          setForm({
                            ...form,
                            rows: form.rows.map((item, itemIndex) =>
                              itemIndex === index
                                ? { ...item, sortOrder: event.target.value }
                                : item,
                            ),
                          })
                        }
                      />
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

          <div className="admin-modal-actions">
            <button
              className="admin-primary"
              onClick={() => void save()}
              disabled={busy}
            >
              {busy ? "Đang lưu…" : form.id ? "Cập nhật" : "Tạo khuyến mãi"}
            </button>
            <button className="admin-ghost" onClick={() => setForm(null)}>
              Hủy
            </button>
          </div>
          <p className="admin-footnote">
            Giá bán hiển thị trên cửa hàng vẫn là giá trong bảng products; giá
            gốc ở đây dùng để gạch ngang và tính mức giảm. Ví dụ:{" "}
            {money(Number(form.rows[0]?.originalPriceVnd) || 0)} → giảm{" "}
            {form.rows[0]?.discountPercent || 0}%.
          </p>
        </AdminModal>
      )}
    </>
  );
}
