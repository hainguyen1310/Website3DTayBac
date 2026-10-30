/**
 * Các khối riêng của A Sỉn cho TipTap. Mỗi khối khớp 1-1 với một block đã lưu
 * (xem convert.ts), nên mọi thứ soạn ở đây đều hiển thị được trên website.
 */

import { Extension, Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { CtaView, FigureView, ImageRowView } from "./nodeViews";

export type FigureStatus = "uploading" | "error" | null;
export type RowImage = { url: string; alt: string; caption: string; status?: FigureStatus; uid?: string };

/** Đoạn mở đầu (sapo trong thân bài) là thuộc tính của paragraph. */
export const LeadParagraph = Extension.create({
  name: "leadParagraph",
  addGlobalAttributes() {
    return [{
      types: ["paragraph"],
      attributes: {
        lead: {
          default: false,
          parseHTML: (element) => element.classList.contains("article-lead"),
          renderHTML: (attributes) => (attributes.lead ? { class: "article-lead" } : {}),
        },
      },
    }];
  },
});

export const Callout = Node.create({
  name: "callout",
  group: "block",
  content: "paragraph+",
  defining: true,
  addAttributes() {
    return {
      variant: {
        default: "tip",
        parseHTML: (element) => (["tip", "note", "info"].find((variant) => element.classList.contains(`is-${variant}`)) ?? "tip"),
        renderHTML: () => ({}),
      },
    };
  },
  parseHTML() {
    return [{ tag: "aside.article-callout" }];
  },
  renderHTML({ node, HTMLAttributes }) {
    return ["aside", mergeAttributes(HTMLAttributes, { class: `article-callout is-${node.attrs.variant}` }), 0];
  },
});

export const Figure = Node.create({
  name: "figure",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,
  addAttributes() {
    return {
      src: { default: "" },
      alt: { default: "" },
      caption: { default: "" },
      size: { default: "full" },
      // Trạng thái tải lên chỉ tồn tại trong lúc soạn, không lưu vào block.
      status: { default: null, rendered: false },
      uid: { default: null, rendered: false },
    };
  },
  parseHTML() {
    return [
      {
        tag: "figure",
        getAttrs: (element) => {
          const img = element.querySelector("img");
          if (!img?.getAttribute("src")) return false;
          return {
            src: img.getAttribute("src"),
            alt: img.getAttribute("alt") ?? "",
            caption: element.querySelector("figcaption")?.textContent?.trim() ?? "",
            size: element.classList.contains("is-small") ? "small" : "full",
          };
        },
      },
      {
        tag: "img[src]",
        getAttrs: (element) => ({ src: element.getAttribute("src"), alt: element.getAttribute("alt") ?? "" }),
      },
    ];
  },
  renderHTML({ node }) {
    return ["figure", { class: node.attrs.size === "small" ? "article-photo is-small" : "article-photo" },
      ["img", { src: node.attrs.src, alt: node.attrs.alt }],
      ...(node.attrs.caption ? [["figcaption", {}, node.attrs.caption]] : [])];
  },
  addNodeView() {
    return ReactNodeViewRenderer(FigureView);
  },
});

export const ImageRow = Node.create({
  name: "imageRow",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,
  addAttributes() {
    return {
      images: { default: [] as RowImage[], rendered: false },
    };
  },
  parseHTML() {
    return [{
      tag: "div.sf-article-pair, div.article-gallery",
      getAttrs: (element) => ({
        images: [...element.querySelectorAll("img")].map((img) => ({ url: img.getAttribute("src") ?? "", alt: img.getAttribute("alt") ?? "", caption: "" })),
      }),
    }];
  },
  renderHTML({ node }) {
    const images = (node.attrs.images as RowImage[]) ?? [];
    return ["div", { class: images.length > 2 ? `article-gallery is-${images.length}` : "sf-article-pair" },
      ...images.map((image) => ["figure", { class: "article-photo" }, ["img", { src: image.url, alt: image.alt }]])];
  },
  addNodeView() {
    return ReactNodeViewRenderer(ImageRowView);
  },
});

export const Cta = Node.create({
  name: "cta",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,
  addAttributes() {
    return {
      label: { default: "" },
      href: { default: "/san-pham" },
      productId: { default: "" },
    };
  },
  parseHTML() {
    return [{ tag: "p.article-cta" }];
  },
  renderHTML({ node }) {
    return ["p", { class: "article-cta" }, ["a", { href: node.attrs.href }, node.attrs.label]];
  },
  addNodeView() {
    return ReactNodeViewRenderer(CtaView);
  },
});
