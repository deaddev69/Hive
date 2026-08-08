"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Minus,
  Link as LinkIcon,
  Image as ImageIcon,
  Undo2,
  Redo2,
  Code2,
  Eye,
  Loader2,
  UploadCloud,
  Check,
  X,
} from "lucide-react";

interface TipTapEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

export function TipTapEditor({
  content,
  onChange,
  placeholder = "Write your engaging, SEO-rich article here...",
}: TipTapEditorProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [isSourceMode, setIsSourceMode] = useState(false);
  const [rawHtml, setRawHtml] = useState(content);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Upload image to secured Cloudflare R2 endpoint
  const uploadToR2 = useCallback(async (file: File): Promise<string | null> => {
    setIsUploading(true);
    setUploadError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload/r2", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.url) {
        throw new Error(data.error || "Failed to upload image to Cloudflare R2");
      }

      return data.url;
    } catch (err: any) {
      console.error("R2 Upload Error:", err);
      setUploadError(err.message || "Failed to upload image.");
      return null;
    } finally {
      setIsUploading(false);
    }
  }, []);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4],
        },
      }),
      Underline,
      Image.configure({
        inline: false,
        allowBase64: false,
        HTMLAttributes: {
          class: "rounded-2xl max-w-full h-auto my-6 shadow-sm border border-slate-100",
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-amber-600 underline font-medium hover:text-amber-700 transition-colors",
          target: "_blank",
          rel: "noopener noreferrer",
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content,
    editorProps: {
      attributes: {
        class:
          "prose prose-slate max-w-none focus:outline-none min-h-[380px] p-6 text-slate-800 leading-relaxed font-sans prose-headings:font-serif prose-headings:font-bold prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl prose-p:my-3 prose-ul:my-3 prose-ol:my-3 prose-li:my-1",
      },
      handleDrop: (view, event, slice, moved) => {
        if (!moved && event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0]) {
          const file = event.dataTransfer.files[0];
          if (file.type.startsWith("image/")) {
            event.preventDefault();
            uploadToR2(file).then((url) => {
              if (url && editor) {
                editor.chain().focus().setImage({ src: url, alt: file.name }).run();
              }
            });
            return true;
          }
        }
        return false;
      },
      handlePaste: (view, event) => {
        const clipboardItems = event.clipboardData?.items;
        if (clipboardItems) {
          for (let i = 0; i < clipboardItems.length; i++) {
            const item = clipboardItems[i];
            if (item && item.type && item.type.indexOf("image") === 0) {
              const file = item.getAsFile();
              if (file) {
                event.preventDefault();
                uploadToR2(file).then((url) => {
                  if (url && editor) {
                    editor.chain().focus().setImage({ src: url, alt: "Pasted Article Image" }).run();
                  }
                });
                return true;
              }
            }
          }
        }
        return false;
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      setRawHtml(html);
      onChange(html);
    },
    immediatelyRender: false,
  });

  // Sync content updates when initial content changes externally
  useEffect(() => {
    if (editor && content !== editor.getHTML() && !editor.isFocused && !isSourceMode) {
      editor.commands.setContent(content, { emitUpdate: false });
      setRawHtml(content);
    }
  }, [content, editor, isSourceMode]);

  const handleImageFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && editor) {
      const url = await uploadToR2(file);
      if (url) {
        editor.chain().focus().setImage({ src: url, alt: file.name }).run();
      }
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSetLink = () => {
    if (!editor) return;
    if (linkUrl.trim() === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    } else {
      let finalUrl = linkUrl.trim();
      if (!/^https?:\/\//i.test(finalUrl) && !finalUrl.startsWith("/")) {
        finalUrl = `https://${finalUrl}`;
      }
      editor.chain().focus().extendMarkRange("link").setLink({ href: finalUrl }).run();
    }
    setShowLinkModal(false);
    setLinkUrl("");
  };

  const toggleSourceMode = () => {
    if (isSourceMode) {
      // Switching from raw HTML to TipTap visual
      if (editor) {
        editor.commands.setContent(rawHtml, { emitUpdate: false });
        onChange(rawHtml);
      }
      setIsSourceMode(false);
    } else {
      // Switching to raw HTML source view
      if (editor) {
        setRawHtml(editor.getHTML());
      }
      setIsSourceMode(true);
    }
  };

  const handleRawHtmlChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setRawHtml(e.target.value);
    onChange(e.target.value);
  };

  if (!editor) {
    return (
      <div className="flex items-center justify-center h-64 border border-slate-200 rounded-2xl bg-white text-slate-400">
        <Loader2 className="w-6 h-6 animate-spin text-amber-500 mr-2" />
        Loading WYSIWYG Editor...
      </div>
    );
  }

  return (
    <div className="flex flex-col border border-slate-200 rounded-2xl bg-white overflow-hidden shadow-sm focus-within:border-amber-400 transition-colors">
      {/* Hidden File Input for Image Upload */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImageFileSelect}
        accept="image/jpeg,image/png,image/webp,image/svg+xml"
        className="hidden"
      />

      {/* Editor Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-1 p-2.5 bg-slate-50 border-b border-slate-200">
        <div className="flex flex-wrap items-center gap-1">
          {/* Headings */}
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            className={`p-2 rounded-lg text-xs font-bold transition-colors ${
              editor.isActive("heading", { level: 1 })
                ? "bg-amber-100 text-amber-900"
                : "text-slate-700 hover:bg-slate-200/60"
            }`}
            title="Heading 1"
          >
            <Heading1 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={`p-2 rounded-lg text-xs font-bold transition-colors ${
              editor.isActive("heading", { level: 2 })
                ? "bg-amber-100 text-amber-900"
                : "text-slate-700 hover:bg-slate-200/60"
            }`}
            title="Heading 2"
          >
            <Heading2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            className={`p-2 rounded-lg text-xs font-bold transition-colors ${
              editor.isActive("heading", { level: 3 })
                ? "bg-amber-100 text-amber-900"
                : "text-slate-700 hover:bg-slate-200/60"
            }`}
            title="Heading 3"
          >
            <Heading3 className="w-4 h-4" />
          </button>

          <div className="w-px h-5 bg-slate-300 mx-1 self-center" />

          {/* Inline Styles */}
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`p-2 rounded-lg transition-colors ${
              editor.isActive("bold")
                ? "bg-amber-100 text-amber-900"
                : "text-slate-700 hover:bg-slate-200/60"
            }`}
            title="Bold (Ctrl+B)"
          >
            <Bold className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`p-2 rounded-lg transition-colors ${
              editor.isActive("italic")
                ? "bg-amber-100 text-amber-900"
                : "text-slate-700 hover:bg-slate-200/60"
            }`}
            title="Italic (Ctrl+I)"
          >
            <Italic className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            className={`p-2 rounded-lg transition-colors ${
              editor.isActive("underline")
                ? "bg-amber-100 text-amber-900"
                : "text-slate-700 hover:bg-slate-200/60"
            }`}
            title="Underline (Ctrl+U)"
          >
            <UnderlineIcon className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleStrike().run()}
            className={`p-2 rounded-lg transition-colors ${
              editor.isActive("strike")
                ? "bg-amber-100 text-amber-900"
                : "text-slate-700 hover:bg-slate-200/60"
            }`}
            title="Strikethrough"
          >
            <Strikethrough className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleCode().run()}
            className={`p-2 rounded-lg transition-colors ${
              editor.isActive("code")
                ? "bg-amber-100 text-amber-900"
                : "text-slate-700 hover:bg-slate-200/60"
            }`}
            title="Inline Code"
          >
            <Code className="w-4 h-4" />
          </button>

          <div className="w-px h-5 bg-slate-300 mx-1 self-center" />

          {/* Lists & Quotes */}
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`p-2 rounded-lg transition-colors ${
              editor.isActive("bulletList")
                ? "bg-amber-100 text-amber-900"
                : "text-slate-700 hover:bg-slate-200/60"
            }`}
            title="Bullet List"
          >
            <List className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={`p-2 rounded-lg transition-colors ${
              editor.isActive("orderedList")
                ? "bg-amber-100 text-amber-900"
                : "text-slate-700 hover:bg-slate-200/60"
            }`}
            title="Numbered List"
          >
            <ListOrdered className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            className={`p-2 rounded-lg transition-colors ${
              editor.isActive("blockquote")
                ? "bg-amber-100 text-amber-900"
                : "text-slate-700 hover:bg-slate-200/60"
            }`}
            title="Blockquote"
          >
            <Quote className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
            className="p-2 rounded-lg text-slate-700 hover:bg-slate-200/60 transition-colors"
            title="Divider Line"
          >
            <Minus className="w-4 h-4" />
          </button>

          <div className="w-px h-5 bg-slate-300 mx-1 self-center" />

          {/* Links & Cloudflare R2 Images */}
          <button
            type="button"
            onClick={() => {
              const previousUrl = editor.getAttributes("link").href;
              setLinkUrl(previousUrl || "");
              setShowLinkModal(true);
            }}
            className={`p-2 rounded-lg transition-colors ${
              editor.isActive("link")
                ? "bg-amber-100 text-amber-900"
                : "text-slate-700 hover:bg-slate-200/60"
            }`}
            title="Insert Link"
          >
            <LinkIcon className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white transition-colors shadow-sm disabled:opacity-50"
            title="Upload Image directly to Cloudflare R2"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Uploading R2...</span>
              </>
            ) : (
              <>
                <ImageIcon className="w-3.5 h-3.5" />
                <span>Add R2 Image</span>
              </>
            )}
          </button>
        </div>

        {/* Undo / Redo & HTML Source Mode */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            className="p-2 rounded-lg text-slate-600 hover:bg-slate-200/60 disabled:opacity-30 transition-colors"
            title="Undo"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            className="p-2 rounded-lg text-slate-600 hover:bg-slate-200/60 disabled:opacity-30 transition-colors"
            title="Redo"
          >
            <Redo2 className="w-4 h-4" />
          </button>

          <div className="w-px h-5 bg-slate-300 mx-1 self-center" />

          <button
            type="button"
            onClick={toggleSourceMode}
            className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
              isSourceMode
                ? "bg-slate-900 text-white border-slate-900"
                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
            }`}
            title="Toggle HTML Source View"
          >
            {isSourceMode ? (
              <>
                <Eye className="w-3.5 h-3.5" />
                <span>Visual</span>
              </>
            ) : (
              <>
                <Code2 className="w-3.5 h-3.5" />
                <span>HTML</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Link Modal / Popover */}
      {showLinkModal && (
        <div className="p-3 bg-amber-50/80 border-b border-amber-200 flex items-center gap-2">
          <LinkIcon className="w-4 h-4 text-amber-700 shrink-0" />
          <input
            type="url"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="https://hivenow.in/products/sarees or external link"
            className="flex-1 text-xs px-3 py-1.5 bg-white border border-amber-200 rounded-lg focus:outline-none focus:border-amber-500"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSetLink();
              } else if (e.key === "Escape") {
                setShowLinkModal(false);
              }
            }}
            autoFocus
          />
          <button
            type="button"
            onClick={handleSetLink}
            className="px-3 py-1.5 bg-amber-600 text-white text-xs font-bold rounded-lg hover:bg-amber-700 transition-colors"
          >
            Save
          </button>
          <button
            type="button"
            onClick={() => setShowLinkModal(false)}
            className="p-1.5 text-slate-500 hover:text-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Upload Error Banner */}
      {uploadError && (
        <div className="p-2.5 bg-red-50 text-red-700 text-xs flex items-center justify-between border-b border-red-200">
          <span>{uploadError}</span>
          <button
            type="button"
            onClick={() => setUploadError(null)}
            className="text-red-500 hover:text-red-800"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Content Area */}
      {isSourceMode ? (
        <textarea
          value={rawHtml}
          onChange={handleRawHtmlChange}
          placeholder="<h1>Raw HTML Content</h1>"
          className="w-full min-h-[380px] p-6 font-mono text-xs text-slate-800 bg-slate-900 text-slate-100 focus:outline-none leading-relaxed resize-y"
          spellCheck={false}
        />
      ) : (
        <div className="relative">
          <EditorContent editor={editor} />
        </div>
      )}

      {/* Footer Info & Word Counter */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-50/50 border-t border-slate-100 text-[11px] text-slate-400">
        <div className="flex items-center gap-3">
          <span>
            {editor.getText().trim() ? editor.getText().trim().split(/\s+/).length : 0} words
          </span>
          <span>•</span>
          <span>{editor.getText().length} characters</span>
          <span>•</span>
          <span>Paste / Drag-and-drop images to push directly to Cloudflare R2</span>
        </div>
        <div className="flex items-center gap-1 font-semibold text-slate-500">
          <UploadCloud className="w-3 h-3 text-amber-500" />
          <span>R2 WYSIWYG Engine</span>
        </div>
      </div>
    </div>
  );
}
