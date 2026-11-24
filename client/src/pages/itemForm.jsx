import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Gift, Image, MapPin } from "lucide-react";

import Navbar from "../components/navbar";
import { useAuth } from "../context/authContext";
import { useToast } from "../context/notificationContext";
import {
  ITEM_CATEGORIES,
  ITEM_CONDITIONS,
} from "../constants/items";
import { createItem, getItemById, updateItem } from "../services/api";
import "../styles/itemForm.css";

const emptyForm = {
  title: "",
  description: "",
  category: "household",
  condition: "good",
  city: "",
  imageUrl: "",
};

export default function ItemForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { accessToken, loading: authLoading } = useAuth();
  const toast = useToast();

  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isEdit) {
      return;
    }

    if (authLoading) return;

    let active = true;

    async function loadItem() {
      setLoading(true);
      setError("");

      try {
        if (!accessToken) {
          throw new Error("Please log in to edit this item.");
        }

        const data = await getItemById(id, accessToken);

        if (!data.viewer.is_owner) {
          throw new Error("Only the listing owner can edit this item.");
        }

        if (data.item.status !== "available") {
          throw new Error(
            "This listing is no longer editable because it is reserved, donated, or closed.",
          );
        }

        if (active) {
          setForm({
            title: data.item.title,
            description: data.item.description,
            category: data.item.category,
            condition: data.item.condition,
            city: data.item.city,
            imageUrl: data.item.image_url ?? "",
          });
        }
      } catch (err) {
        if (active) {
          setError(err.message || "Failed to load item.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadItem();

    return () => {
      active = false;
    };
  }, [id, isEdit, accessToken, authLoading]);

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({ ...previous, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (!accessToken) {
      setError("Please log in to continue.");
      return;
    }

    const title = form.title.trim();
    const description = form.description.trim();
    const city = form.city.trim();
    const imageUrl = form.imageUrl.trim();

    if (title.length < 3) {
      setError("Title must be at least 3 characters.");
      return;
    }

    if (description.length < 10) {
      setError("Description must be at least 10 characters.");
      return;
    }

    if (!city) {
      setError("Please enter the item's city.");
      return;
    }

    if (imageUrl && !/^https?:\/\/\S+$/i.test(imageUrl)) {
      setError("Image URL must start with http:// or https://.");
      return;
    }

    setSaving(true);

    const payload = {
      title,
      description,
      category: form.category,
      condition: form.condition,
      city,
      imageUrl: imageUrl || null,
    };

    try {
      const data = isEdit
        ? await updateItem(id, payload, accessToken)
        : await createItem(payload, accessToken);

      toast.success(
        isEdit ? "Item listing updated." : "Item listed for sharing.",
      );
      navigate(`/items/${data.item.id}`);
    } catch (err) {
      const message = err.message || "Unable to save the item.";
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Navbar />

      <main className="item-form-page">
        <div className="item-form-container">
          <Link
            to={isEdit ? `/items/${id}` : "/items"}
            className="item-form-back"
          >
            <ArrowLeft size={17} />
            {isEdit ? "Back to item" : "Back to free items"}
          </Link>

          <header className="item-form-header">
            <div className="item-form-icon">
              <Gift size={27} />
            </div>

            <span className="item-form-eyebrow">
              {isEdit ? "UPDATE YOUR LISTING" : "SHARE WITH YOUR COMMUNITY"}
            </span>

            <h1>{isEdit ? "Edit your item" : "List a free item"}</h1>

            <p>
              Offer something useful to someone nearby. Items are shared for
              free — no payment is involved.
            </p>
          </header>

          <section className="item-form-card">
            {loading ? (
              <p className="item-form-status">Loading item...</p>
            ) : (
              <>
                {error && (
                  <div className="item-form-error" role="alert">
                    {error}
                  </div>
                )}

                {isEdit && error ? (
                  <div className="item-form-status-actions">
                    <Link to="/my-activities">Go to My Activities</Link>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit}>
                    <div className="item-form-field">
                      <label htmlFor="title">Item title *</label>
                      <input
                        id="title"
                        name="title"
                        type="text"
                        maxLength={200}
                        placeholder="e.g. Wooden study desk"
                        value={form.title}
                        onChange={handleChange}
                        required
                      />
                    </div>

                    <div className="item-form-field">
                      <label htmlFor="description">Description *</label>
                      <textarea
                        id="description"
                        name="description"
                        rows={5}
                        maxLength={5000}
                        placeholder="Describe the item, its condition, and anything the recipient should know..."
                        value={form.description}
                        onChange={handleChange}
                        required
                      />
                      <small>At least 10 characters.</small>
                    </div>

                    <div className="item-form-grid">
                      <div className="item-form-field">
                        <label htmlFor="category">Category *</label>
                        <select
                          id="category"
                          name="category"
                          value={form.category}
                          onChange={handleChange}
                        >
                          {ITEM_CATEGORIES.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="item-form-field">
                        <label htmlFor="condition">Condition *</label>
                        <select
                          id="condition"
                          name="condition"
                          value={form.condition}
                          onChange={handleChange}
                        >
                          {ITEM_CONDITIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="item-form-field">
                      <label htmlFor="city">
                        <MapPin size={15} />
                        City *
                      </label>
                      <input
                        id="city"
                        name="city"
                        type="text"
                        maxLength={100}
                        placeholder="e.g. Mangalore"
                        value={form.city}
                        onChange={handleChange}
                        required
                      />
                    </div>

                    <div className="item-form-field">
                      <label htmlFor="imageUrl">
                        <Image size={15} />
                        Image URL
                      </label>
                      <input
                        id="imageUrl"
                        name="imageUrl"
                        type="url"
                        maxLength={2000}
                        placeholder="https://example.com/item-photo.jpg"
                        value={form.imageUrl}
                        onChange={handleChange}
                      />
                      <small>
                        Optional. Use a public image link. Do not include
                        private contact details in photos.
                      </small>
                    </div>

                    <div className="item-form-actions">
                      <Link to={isEdit ? `/items/${id}` : "/items"}>
                        Cancel
                      </Link>

                      <button type="submit" disabled={saving}>
                        {saving
                          ? "Saving..."
                          : isEdit
                            ? "Save changes"
                            : "List item"}
                      </button>
                    </div>
                  </form>
                )}
              </>
            )}
          </section>
        </div>
      </main>
    </>
  );
}
