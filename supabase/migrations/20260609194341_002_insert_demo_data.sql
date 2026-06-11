-- Insert categories
INSERT INTO categories (name, icon, sort_order) VALUES
  ('Entrées', 'Soup', 1),
  ('Plats', 'Beef', 2),
  ('Pizzas', 'Pizza', 3),
  ('Burgers', 'Sandwich', 4),
  ('Desserts', 'Cake', 5),
  ('Boissons', 'Coffee', 6),
  ('Vins', 'Wine', 7);

-- Insert products with Pexels stock images
INSERT INTO products (name, price, image_url, category_id, stock, is_available) VALUES
  -- Entrées
  ('Soupe à l''oignon', 8.50, 'https://images.pexels.com/photos/1707270/pexels-photo-1707270.jpeg?auto=compress&cs=tinysrgb&w=400', (SELECT id FROM categories WHERE name = 'Entrées'), 50, true),
  ('Salade César', 9.00, 'https://images.pexels.com/photos/2097090/pexels-photo-2097090.jpeg?auto=compress&cs=tinysrgb&w=400', (SELECT id FROM categories WHERE name = 'Entrées'), 40, true),
  ('Bruschetta', 7.50, 'https://images.pexels.com/photos/1126759/pexels-photo-1126759.jpeg?auto=compress&cs=tinysrgb&w=400', (SELECT id FROM categories WHERE name = 'Entrées'), 35, true),
  ('Foie gras', 16.00, 'https://images.pexels.com/photos/6941010/pexels-photo-6941010.jpeg?auto=compress&cs=tinysrgb&w=400', (SELECT id FROM categories WHERE name = 'Entrées'), 20, true),

  -- Plats
  ('Steak frites', 22.00, 'https://images.pexels.com/photos/675951/pexels-photo-675951.jpeg?auto=compress&cs=tinysrgb&w=400', (SELECT id FROM categories WHERE name = 'Plats'), 30, true),
  ('Saumon grillé', 24.00, 'https://images.pexels.com/photos/725995/pexels-photo-725995.jpeg?auto=compress&cs=tinysrgb&w=400', (SELECT id FROM categories WHERE name = 'Plats'), 25, true),
  ('Risotto champignons', 18.00, 'https://images.pexels.com/photos/43351/rice-noodles-asian-cuisine-43351.jpeg?auto=compress&cs=tinysrgb&w=400', (SELECT id FROM categories WHERE name = 'Plats'), 30, true),
  ('Poulet rôti', 19.00, 'https://images.pexels.com/photos/2338407/pexels-photo-2338407.jpeg?auto=compress&cs=tinysrgb&w=400', (SELECT id FROM categories WHERE name = 'Plats'), 25, true),
  ('Côte d''agneau', 26.00, 'https://images.pexels.com/photos/361208/pexels-photo-361208.jpeg?auto=compress&cs=tinysrgb&w=400', (SELECT id FROM categories WHERE name = 'Plats'), 15, true),

  -- Pizzas
  ('Margherita', 14.00, 'https://images.pexels.com/photos/2147491/pexels-photo-2147491.jpeg?auto=compress&cs=tinysrgb&w=400', (SELECT id FROM categories WHERE name = 'Pizzas'), 40, true),
  ('Quatre fromages', 16.00, 'https://images.pexels.com/photos/4109111/pexels-photo-4109111.jpeg?auto=compress&cs=tinysrgb&w=400', (SELECT id FROM categories WHERE name = 'Pizzas'), 35, true),
  ('Reine', 15.00, 'https://images.pexels.com/photos/4109111/pexels-photo-4109111.jpeg?auto=compress&cs=tinysrgb&w=400', (SELECT id FROM categories WHERE name = 'Pizzas'), 30, true),
  ('Calzone', 17.00, 'https://images.pexels.com/photos/4109111/pexels-photo-4109111.jpeg?auto=compress&cs=tinysrgb&w=400', (SELECT id FROM categories WHERE name = 'Pizzas'), 25, true),

  -- Burgers
  ('Classic Burger', 13.00, 'https://images.pexels.com/photos/1639557/pexels-photo-1639557.jpeg?auto=compress&cs=tinysrgb&w=400', (SELECT id FROM categories WHERE name = 'Burgers'), 45, true),
  ('Cheese Burger', 14.50, 'https://images.pexels.com/photos/1556688/pexels-photo-1556688.jpeg?auto=compress&cs=tinysrgb&w=400', (SELECT id FROM categories WHERE name = 'Burgers'), 40, true),
  ('Bacon Burger', 16.00, 'https://images.pexels.com/photos/1556688/pexels-photo-1556688.jpeg?auto=compress&cs=tinysrgb&w=400', (SELECT id FROM categories WHERE name = 'Burgers'), 35, true),

  -- Desserts
  ('Crème brûlée', 8.00, 'https://images.pexels.com/photos/132694/pexels-photo-132694.jpeg?auto=compress&cs=tinysrgb&w=400', (SELECT id FROM categories WHERE name = 'Desserts'), 30, true),
  ('Tarte tatin', 9.00, 'https://images.pexels.com/photos/132694/pexels-photo-132694.jpeg?auto=compress&cs=tinysrgb&w=400', (SELECT id FROM categories WHERE name = 'Desserts'), 25, true),
  ('Mousse au chocolat', 7.50, 'https://images.pexels.com/photos/132694/pexels-photo-132694.jpeg?auto=compress&cs=tinysrgb&w=400', (SELECT id FROM categories WHERE name = 'Desserts'), 35, true),
  ('Profiteroles', 8.50, 'https://images.pexels.com/photos/132694/pexels-photo-132694.jpeg?auto=compress&cs=tinysrgb&w=400', (SELECT id FROM categories WHERE name = 'Desserts'), 20, true),

  -- Boissons
  ('Café', 3.00, 'https://images.pexels.com/photos/312418/pexels-photo-312418.jpeg?auto=compress&cs=tinysrgb&w=400', (SELECT id FROM categories WHERE name = 'Boissons'), 100, true),
  ('Thé', 3.50, 'https://images.pexels.com/photos/1417945/pexels-photo-1417945.jpeg?auto=compress&cs=tinysrgb&w=400', (SELECT id FROM categories WHERE name = 'Boissons'), 80, true),
  ('Jus d''orange frais', 5.00, 'https://images.pexels.com/photos/161559/background-dirty-juice-161559.jpeg?auto=compress&cs=tinysrgb&w=400', (SELECT id FROM categories WHERE name = 'Boissons'), 50, true),
  ('Limonade', 4.50, 'https://images.pexels.com/photos/602750/pexels-photo-602750.jpeg?auto=compress&cs=tinysrgb&w=400', (SELECT id FROM categories WHERE name = 'Boissons'), 60, true),
  ('Eau minérale', 2.50, 'https://images.pexels.com/photos/327090/pexels-photo-327090.jpeg?auto=compress&cs=tinysrgb&w=400', (SELECT id FROM categories WHERE name = 'Boissons'), 200, true),

  -- Vins
  ('Bordeaux rouge', 7.00, 'https://images.pexels.com/photos/2912108/pexels-photo-2912108.jpeg?auto=compress&cs=tinysrgb&w=400', (SELECT id FROM categories WHERE name = 'Vins'), 50, true),
  ('Chablis blanc', 8.00, 'https://images.pexels.com/photos/2912108/pexels-photo-2912108.jpeg?auto=compress&cs=tinysrgb&w=400', (SELECT id FROM categories WHERE name = 'Vins'), 40, true),
  ('Champagne', 12.00, 'https://images.pexels.com/photos/59928/pexels-photo-59928.jpeg?auto=compress&cs=tinysrgb&w=400', (SELECT id FROM categories WHERE name = 'Vins'), 30, true),
  ('Rosé Provence', 6.50, 'https://images.pexels.com/photos/2912108/pexels-photo-2912108.jpeg?auto=compress&cs=tinysrgb&w=400', (SELECT id FROM categories WHERE name = 'Vins'), 45, true);
