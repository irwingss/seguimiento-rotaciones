# Seguimiento de Campos Clínicos - INSNSB

Dashboard en tiempo real para el seguimiento de campos clínicos disponibles para médicos residentes.

## 📋 Descripción

Esta aplicación web muestra información actualizada sobre:
- **Servicios a Rotar** - Servicios disponibles para rotación
- **Unidades y Sub Unidades** - Estructura organizacional
- **Tutores de Servicio** - Personal asignado
- **Campos Clínicos Disponibles** - Cantidad de plazas

Los datos se obtienen directamente desde Google Sheets, permitiendo actualizaciones en tiempo real.

## 🏥 Institución

**Instituto Nacional de Salud del Niño - San Borja (INSNSB)**
- Sub Unidad de Normalización Técnica y Desarrollo de la Docencia (SUNTDD)
- Unidad de Desarrollo de la Investigación, Tecnologías y Docencia (UDITD)

## 🚀 Despliegue en GitHub Pages

1. Subir el repositorio a GitHub
2. Ir a **Settings** > **Pages**
3. En "Source", seleccionar **Deploy from a branch**
4. Seleccionar la rama `main` y carpeta `/ (root)`
5. Hacer clic en **Save**

La aplicación estará disponible en: `https://[usuario].github.io/seguimiento-rotaciones/`

## 📁 Estructura del Proyecto

```
seguimiento-rotaciones/
├── index.html      # Página principal
├── styles.css      # Estilos CSS
├── app.js          # Lógica JavaScript
├── logos/          # Logos institucionales
│   ├── certif_logo_minsa.png
│   └── certif_logo_insnsb.png
└── README.md
```

## 🔧 Configuración

La fuente de datos está configurada en `app.js`:
```javascript
const SPREADSHEET_ID = '1Xsj40BmUG4Lytgg0nyYe6cTdTGeT6kix';
const SHEET_GID = '1595642989';
```

El spreadsheet debe estar compartido públicamente para que la aplicación pueda leer los datos.

## 📞 Contacto

**Lic. Natalie Roxana Herrera Castellano**  
Especialista Administrativo  
Telf.: 2300600 Anexo 4062  
Email: nherrera@insnsb.gob.pe

## 📄 Licencia

© 2025 INSNSB - Todos los derechos reservados
