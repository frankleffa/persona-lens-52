
-- Drop the FK on client_user_id to allow demo UUIDs
ALTER TABLE public.client_manager_links DROP CONSTRAINT client_manager_links_client_user_id_fkey;

-- Insert demo client links
INSERT INTO public.client_manager_links (manager_id, client_user_id, client_label, is_demo)
VALUES 
  ('1265e051-4950-45e1-96dc-cab602412461', '00000000-0000-0000-0000-000000000001', 'Digital Academy Pro (DEMO)', true),
  ('1265e051-4950-45e1-96dc-cab602412461', '00000000-0000-0000-0000-000000000002', 'Urban Fit Store (DEMO)', true);
