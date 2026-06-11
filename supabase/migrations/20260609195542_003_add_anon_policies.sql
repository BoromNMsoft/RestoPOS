-- Add anon policies so the POS app can work without authentication
CREATE POLICY "categories_select_anon" ON categories FOR SELECT TO anon USING (true);
CREATE POLICY "categories_insert_anon" ON categories FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "categories_update_anon" ON categories FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "categories_delete_anon" ON categories FOR DELETE TO anon USING (true);

CREATE POLICY "products_select_anon" ON products FOR SELECT TO anon USING (true);
CREATE POLICY "products_insert_anon" ON products FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "products_update_anon" ON products FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "products_delete_anon" ON products FOR DELETE TO anon USING (true);

CREATE POLICY "sales_select_anon" ON sales FOR SELECT TO anon USING (true);
CREATE POLICY "sales_insert_anon" ON sales FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "sales_update_anon" ON sales FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "sales_delete_anon" ON sales FOR DELETE TO anon USING (true);

CREATE POLICY "sale_items_select_anon" ON sale_items FOR SELECT TO anon USING (true);
CREATE POLICY "sale_items_insert_anon" ON sale_items FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "sale_items_update_anon" ON sale_items FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "sale_items_delete_anon" ON sale_items FOR DELETE TO anon USING (true);
