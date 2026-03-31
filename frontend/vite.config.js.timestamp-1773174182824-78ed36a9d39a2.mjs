// vite.config.js
import { defineConfig } from "file:///Users/asheeshdhamacharla/Desktop/Job-Hunt-os/frontend/node_modules/vite/dist/node/index.js";
import react from "file:///Users/asheeshdhamacharla/Desktop/Job-Hunt-os/frontend/node_modules/@vitejs/plugin-react/dist/index.js";
var BACKEND = "http://127.0.0.1:8000";
var vite_config_default = defineConfig({
  plugins: [react()],
  server: {
    host: true,
    // Exposes on all local IPs to avoid IPv4/v6 connection refused
    port: 5173,
    strictPort: true,
    proxy: {
      // Covers every route in main.py:
      //   /api/orchestrate
      //   /api/agents/*
      //   /api/applications, /api/profile, /api/logs, /api/feedback
      //   /api/scout/*
      //   /api/resume, /api/research, /api/outreach, /api/skill-gap
      //   /api/interview/v2/*  (REST)
      "/api": {
        target: BACKEND,
        changeOrigin: true
      },
      // WebSocket must be a separate entry with ws:true
      // Vite matches the most specific key first, so this takes
      // priority over the '/api' entry above for WS upgrade requests
      "/api/interview/v2/ws": {
        target: BACKEND,
        changeOrigin: true,
        ws: true
      }
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvVXNlcnMvYXNoZWVzaGRoYW1hY2hhcmxhL0Rlc2t0b3AvSm9iLUh1bnQtb3MvZnJvbnRlbmRcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIi9Vc2Vycy9hc2hlZXNoZGhhbWFjaGFybGEvRGVza3RvcC9Kb2ItSHVudC1vcy9mcm9udGVuZC92aXRlLmNvbmZpZy5qc1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vVXNlcnMvYXNoZWVzaGRoYW1hY2hhcmxhL0Rlc2t0b3AvSm9iLUh1bnQtb3MvZnJvbnRlbmQvdml0ZS5jb25maWcuanNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJ1xuaW1wb3J0IHJlYWN0IGZyb20gJ0B2aXRlanMvcGx1Z2luLXJlYWN0J1xuXG5jb25zdCBCQUNLRU5EID0gJ2h0dHA6Ly8xMjcuMC4wLjE6ODAwMCdcblxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcbiAgcGx1Z2luczogW3JlYWN0KCldLFxuICBzZXJ2ZXI6IHtcbiAgICBob3N0OiB0cnVlLCAvLyBFeHBvc2VzIG9uIGFsbCBsb2NhbCBJUHMgdG8gYXZvaWQgSVB2NC92NiBjb25uZWN0aW9uIHJlZnVzZWRcbiAgICBwb3J0OiA1MTczLFxuICAgIHN0cmljdFBvcnQ6IHRydWUsXG4gICAgcHJveHk6IHtcbiAgICAgIC8vIENvdmVycyBldmVyeSByb3V0ZSBpbiBtYWluLnB5OlxuICAgICAgLy8gICAvYXBpL29yY2hlc3RyYXRlXG4gICAgICAvLyAgIC9hcGkvYWdlbnRzLypcbiAgICAgIC8vICAgL2FwaS9hcHBsaWNhdGlvbnMsIC9hcGkvcHJvZmlsZSwgL2FwaS9sb2dzLCAvYXBpL2ZlZWRiYWNrXG4gICAgICAvLyAgIC9hcGkvc2NvdXQvKlxuICAgICAgLy8gICAvYXBpL3Jlc3VtZSwgL2FwaS9yZXNlYXJjaCwgL2FwaS9vdXRyZWFjaCwgL2FwaS9za2lsbC1nYXBcbiAgICAgIC8vICAgL2FwaS9pbnRlcnZpZXcvdjIvKiAgKFJFU1QpXG4gICAgICAnL2FwaSc6IHtcbiAgICAgICAgdGFyZ2V0OiBCQUNLRU5ELFxuICAgICAgICBjaGFuZ2VPcmlnaW46IHRydWUsXG4gICAgICB9LFxuICAgICAgLy8gV2ViU29ja2V0IG11c3QgYmUgYSBzZXBhcmF0ZSBlbnRyeSB3aXRoIHdzOnRydWVcbiAgICAgIC8vIFZpdGUgbWF0Y2hlcyB0aGUgbW9zdCBzcGVjaWZpYyBrZXkgZmlyc3QsIHNvIHRoaXMgdGFrZXNcbiAgICAgIC8vIHByaW9yaXR5IG92ZXIgdGhlICcvYXBpJyBlbnRyeSBhYm92ZSBmb3IgV1MgdXBncmFkZSByZXF1ZXN0c1xuICAgICAgJy9hcGkvaW50ZXJ2aWV3L3YyL3dzJzoge1xuICAgICAgICB0YXJnZXQ6IEJBQ0tFTkQsXG4gICAgICAgIGNoYW5nZU9yaWdpbjogdHJ1ZSxcbiAgICAgICAgd3M6IHRydWUsXG4gICAgICB9LFxuICAgIH0sXG4gIH0sXG59KSJdLAogICJtYXBwaW5ncyI6ICI7QUFBb1YsU0FBUyxvQkFBb0I7QUFDalgsT0FBTyxXQUFXO0FBRWxCLElBQU0sVUFBVTtBQUVoQixJQUFPLHNCQUFRLGFBQWE7QUFBQSxFQUMxQixTQUFTLENBQUMsTUFBTSxDQUFDO0FBQUEsRUFDakIsUUFBUTtBQUFBLElBQ04sTUFBTTtBQUFBO0FBQUEsSUFDTixNQUFNO0FBQUEsSUFDTixZQUFZO0FBQUEsSUFDWixPQUFPO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxNQVFMLFFBQVE7QUFBQSxRQUNOLFFBQVE7QUFBQSxRQUNSLGNBQWM7QUFBQSxNQUNoQjtBQUFBO0FBQUE7QUFBQTtBQUFBLE1BSUEsd0JBQXdCO0FBQUEsUUFDdEIsUUFBUTtBQUFBLFFBQ1IsY0FBYztBQUFBLFFBQ2QsSUFBSTtBQUFBLE1BQ047QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
