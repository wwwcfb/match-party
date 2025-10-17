// lib/supabaseClient.js
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://njkdjdijszzsbukertsb.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5qa2RqZGlqc3p6c2J1a2VydHNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxODY4OTQsImV4cCI6MjA2ODc2Mjg5NH0.D01xGNcv-rihUlNI8UfTXNUHL7If_EZ5GB8MQOZfxeU";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10,
    }
  }
});