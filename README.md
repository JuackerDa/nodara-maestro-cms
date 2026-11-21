# Nodara Maestro CMS

Un CMS white-label para negocios en Guatemala. El panel administra contenido, catálogo, multimedia, contacto y SEO. El sitio público consume las publicaciones y puede adoptar cualquiera de los tres temas desde Modo Agencia.

## Arranque local

Requiere Node.js 22 o posterior y npm.

```bash
npm ci
cp -n .env.example .env
```

Edita `.env` y completa `SESSION_SECRET`, `SEED_ADMIN_PASSWORD` y `SEED_EDITOR_PASSWORD` con valores únicos. Puedes generar cada valor con `openssl rand -hex 24`. El repositorio ignora `.env`.

```bash
npm run db:setup
npm run dev
```

Abre http://localhost:3000 para el sitio público y http://localhost:3000/admin/login para el panel. SQLite crea `prisma/dev.db` automáticamente.

El seed carga el negocio ficticio **Casa Nómada**, dos páginas de contenido, cuatro categorías, seis productos y la biblioteca inicial. Si el sitio ya existe, conserva su contenido y sus contraseñas. En desarrollo, el login muestra los correos de las cuentas iniciales. Usa las contraseñas que configuraste en `.env`.

| Rol | Correo | Variable de inicialización |
| --- | --- | --- |
| Super Admin | `admin@nodaraweb.com` | `SEED_ADMIN_PASSWORD` |
| Editor | `editor@casanomada.com.gt` | `SEED_EDITOR_PASSWORD` |

## Operación del CMS

- **Páginas.** El editor previsualiza el borrador usando el mismo renderizador que el sitio público. Guardar conserva el borrador y publicar aplica sus datos, orden y visibilidad. El historial permite recuperar la versión publicada previa y conserva el borrador en curso.
- **Catálogo.** Los cambios de productos, precios y visibilidad se reflejan al guardar. Los pedidos se envían al WhatsApp configurado y no se procesan transacciones dentro del sitio.
- **Multimedia.** Admite JPG, PNG y WebP de hasta 2 MiB por archivo. Reemplazar una imagen conserva su ID. El borrado comprueba referencias de bloques, productos, SEO, logotipo e icono.
- **SEO.** Las vistas previas se actualizan mientras editas. En producción configura la URL canónica en Agencia o mediante `APP_ORIGIN`.
- **Agencia.** Solo el Super Admin puede cambiar temas, límites, módulos o cuentas de editor. Desactivar el catálogo oculta su navegación, bloques y ruta pública, y retira el acceso al editor. Blog y formularios tienen indicadores de plan reservados para su implementación.
- **Animación pública.** GSAP y ScrollTrigger animan las entradas de contenido y el desplazamiento de la portada. El ajuste de animación del tema controla la intensidad. El sitio respeta la preferencia de movimiento reducido del dispositivo.
- **Respaldos.** La exportación JSON incluye contenido, historial, imágenes incrustadas y hashes de contraseñas. El límite por respaldo es de 64 MiB. La restauración valida el archivo antes de reemplazar los datos en una transacción, conserva la cuenta del Super Admin que la ejecuta e invalida las sesiones de las cuentas restauradas.

## PostgreSQL y despliegue

1. Copia `.env.example` a `.env`. Establece `DATABASE_URL` con una cadena PostgreSQL directa para inicializar el esquema. Al detectar esa variable, Prisma genera el cliente PostgreSQL a partir del mismo esquema lógico que usa SQLite. Si cambias el proveedor, vuelve a generar el cliente y compilar.
2. Define `SESSION_SECRET` con al menos 32 caracteres aleatorios y `APP_ORIGIN` con el origen HTTPS del sitio. Usa contraseñas propias en `SEED_ADMIN_PASSWORD` y `SEED_EDITOR_PASSWORD` para inicializar una base nueva.
3. Ejecuta `npm run db:setup` al preparar una base nueva. Si deseas trasladar contenido existente entre motores, exporta un respaldo JSON y restáuralo desde el panel del destino.
4. Para almacenamiento compartido, configura `STORAGE_BUCKET`, `STORAGE_REGION`, `STORAGE_ACCESS_KEY_ID` y `STORAGE_SECRET_ACCESS_KEY`. Para R2 o un proveedor compatible, también configura `STORAGE_ENDPOINT`. El servidor lee los archivos desde el bucket. Con el adaptador local, monta un volumen persistente en `public/uploads` y conserva los archivos en `public/uploads/seed`.
5. Ejecuta `npm run build` y `npm start` detrás de HTTPS. Las cookies de sesión de producción requieren una conexión segura.

## Código y verificación

```bash
npx prisma generate && npx prisma db push && npx prisma db seed
npm run typecheck
npm run build
```

- `src/app/(public)` contiene Inicio, las páginas publicadas y el catálogo.
- `src/app/admin` contiene las pantallas de administración. `src/app/api` expone las operaciones persistentes con validación y permisos en el servidor.
- `src/components/public.tsx` contiene el renderizador público reutilizado por el editor. `src/components/theme.tsx` define las variables que aíslan el tema público.
- `src/lib/storage.ts` abstrae archivos locales y almacenamiento S3/R2. `prisma/schema.prisma` define las entidades y relaciones.
- Las fotografías de la demostración se incluyen localmente bajo la licencia de Unsplash. [Licencia de Unsplash](https://unsplash.com/license)

| Recurso | Fotografía de origen |
| --- | --- |
| Portada | [Unsplash](https://images.unsplash.com/photo-1495474472287-4d71bcdd2085) |
| Cafetería | [Unsplash](https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb) |
| Café filtrado | [Unsplash](https://images.unsplash.com/photo-1447933601403-0c6688de566e) |
| Espresso | [Unsplash](https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04) |
| Latte | [Unsplash](https://images.unsplash.com/photo-1461023058943-07fcbe16d735) |
| Matcha | [Unsplash](https://images.unsplash.com/photo-1515823064-d6e0c04616a7) |
| Croissant | [Unsplash](https://images.unsplash.com/photo-1555507036-ab1f4038808a) |
| Café en grano | [Unsplash](https://images.unsplash.com/photo-1559525839-b184a4d698c7) |
