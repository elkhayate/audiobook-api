-- Supabase Database Schema for AI Audiobook API
-- Run these commands in your Supabase SQL editor

-- Create the files table
CREATE TABLE files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  original_filename text NOT NULL,
  file_size bigint NOT NULL,
  audio_url text NOT NULL,
  audio_duration int NOT NULL,
  summary text NOT NULL,
  created_at timestamp DEFAULT now(),
  listen_count int DEFAULT 0,
  last_listened_at timestamp
);

-- Create indexes for better performance
CREATE INDEX idx_files_user_id ON files(user_id);
CREATE INDEX idx_files_created_at ON files(created_at);
CREATE INDEX idx_files_last_listened_at ON files(last_listened_at);

-- Create storage bucket for audiobooks
INSERT INTO storage.buckets (id, name, public) 
VALUES ('audiobooks', 'audiobooks', true);

-- Create function for atomic listen count increment
CREATE OR REPLACE FUNCTION increment_listen_count(file_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE files 
  SET listen_count = listen_count + 1,
      last_listened_at = now()
  WHERE id = file_id;
END;
$$ LANGUAGE plpgsql;

-- Row Level Security (RLS) policies
ALTER TABLE files ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own files
CREATE POLICY "Users can view their own files" ON files
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can only insert their own files
CREATE POLICY "Users can insert their own files" ON files
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Users can only update their own files
CREATE POLICY "Users can update their own files" ON files
  FOR UPDATE USING (auth.uid() = user_id);

-- Policy: Users can only delete their own files
CREATE POLICY "Users can delete their own files" ON files
  FOR DELETE USING (auth.uid() = user_id);

-- Storage policies for audiobooks bucket
CREATE POLICY "Users can upload their own audiobooks" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'audiobooks' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own audiobooks" ON storage.objects
  FOR SELECT USING (bucket_id = 'audiobooks' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own audiobooks" ON storage.objects
  FOR DELETE USING (bucket_id = 'audiobooks' AND auth.uid()::text = (storage.foldername(name))[1]); 