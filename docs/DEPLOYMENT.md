# Entrega a Vercel — MVP

1. Importar **ingeniusvictor/orbi-solar-quote** en Vercel.
2. Framework: Vite (detectado por `vercel.json`); root directory: `./`.
3. Install command: `npm install`. Build command: `npm run build`; output: `dist`.
4. Usar la rama `main` **solo tras revisar y fusionar el pull request**. Las ramas pueden generar previews.
5. No se requieren variables de entorno ni Supabase para el primer MVP.
6. Comprobar que navegación, refresco, móvil y resultados no muestran errores.

**No hay despliegue activo creado por estos archivos.** GitHub y Vercel deberán conectarse en el proyecto Vercel antes de obtener una URL pública.

## Futuro Android

Una vez estabilizada la UI, agregar `@capacitor/core`, `@capacitor/cli` y `@capacitor/android` con configuración propia, sincronizar `dist` y generar Android App Bundle desde Android Studio. No crear aún el proyecto Android para evitar una base móvil prematura.
