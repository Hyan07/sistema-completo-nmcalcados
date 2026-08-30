ALTER TABLE product_variants
  ADD KEY idx_product_variants_public (product_id, is_active, color_id);

ALTER TABLE product_skus
  ADD KEY idx_product_skus_public (product_variant_id, is_active, size_id);

ALTER TABLE product_images
  ADD KEY idx_product_images_public (product_id, is_primary, sort_order, id);
