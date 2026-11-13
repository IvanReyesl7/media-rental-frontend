# Media Rental (Nuxt)

Interfaz web para consultar medios publicitarios, ver su disponibilidad y gestionar reservas. Consume la API Laravel del repositorio backend.

## Requisitos

- Docker Desktop (incluye Docker Compose v2)
- El repositorio backend clonado **al lado** de esta carpeta (el `docker-compose.yml` está allí)

Opcional, para correrlo sin Docker: Node.js 22 o superior y npm.

## Instalación

Sigue las instrucciones del README del backend, que levanta todo el sistema con Docker Compose. Para instalar solo el frontend sin Docker:

```bash
npm install
```

## Variables de entorno

| Variable | Valor por defecto | Descripción |
|---|---|---|
| `NUXT_PUBLIC_API_BASE` | `http://localhost:8000` | URL base de la API Laravel |

En Docker se define en `docker-compose.yml`. Sin Docker, crea un archivo `.env` en esta carpeta con esa variable.

## Comandos para correr el proyecto

```bash
# Con Docker (desde la carpeta backend/)
docker compose up --build

# Sin Docker (requiere la API corriendo en NUXT_PUBLIC_API_BASE)
npm run dev
npm run build
npm run preview
```

Disponible en http://localhost:3000

## Páginas

| Ruta | Descripción |
|---|---|
| `/media` | Listado de medios con búsqueda, filtros por tipo y estado, y paginación |
| `/media/{id}` | Detalle del medio y consulta de disponibilidad por fechas |
| `/bookings/new` | Crear reserva: selecciona medio, cliente (existente o nuevo) y fechas, con precio estimado |
| `/bookings` | Listado de reservas con filtros, paginación y acciones para confirmar o cancelar |

## Decisiones técnicas

- **Nuxt 4 + Nuxt UI (Tailwind CSS v4)** para una interfaz consistente con pocos estilos propios, y menú adaptable a móvil (slideover).
- **Estructura por responsabilidad**: `pages/` (rutas por archivo), `layouts/default.vue` (encabezado y navegación), `types/` (tipos TypeScript que describen las respuestas de la API).
- **Las peticiones se hacen en el navegador** (`server: false`). El render del servidor corre dentro del contenedor, donde `localhost:8000` no apunta a Laravel, por lo que las llamadas del lado servidor fallarían.
- **Filtros reactivos**: los parámetros de búsqueda son un `computed` pasado a `useFetch`, que vuelve a consultar la API al cambiar. La búsqueda por texto tiene un retraso de 400 ms para no consultar en cada tecla, y cualquier cambio de filtro regresa a la página 1.
- **Cliente existente o nuevo** al crear una reserva: se puede elegir de la lista o crear uno en el mismo formulario (`POST /api/customers`) antes de crear la reserva.
- **El precio mostrado en el formulario es solo una estimación**: el precio real lo calcula y guarda el backend. La disponibilidad se consulta en vivo, pero el backend vuelve a validar el solapamiento.
- **Errores de validación de Laravel** (422) se muestran en pantalla leyendo el campo `errors` de la respuesta.