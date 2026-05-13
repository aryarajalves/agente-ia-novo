DO $$ 
BEGIN 
    FOR i IN 1..65 LOOP 
        INSERT INTO transcription_tasks (filename, s3_key, status, result_text, created_at, updated_at) 
        VALUES ('video_seed_' || LPAD(i::text, 3, '0') || '.mp4', 's3://bucket/seed_' || i || '.mp4', 'SUCCESS', 'Conteúdo transcrito do vídeo de teste ' || i, NOW() - (i || ' minutes')::interval, NOW()); 
    END LOOP; 
END $$;
