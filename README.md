# vportal — Portal del Empleado

Portal en Next.js que se conecta a Odoo (módulo `base_bim_2`) con el usuario y la contraseña BIM del empleado.

## Requisitos en Odoo

En la ficha del empleado, pestaña **BIM Portal**: asignar **BIM User**, escribir una **BIM Password**
(se guarda cifrada) y marcar **BIM Portal Access**.

## Uso

```bash
cp .env.example .env.local   # opcional: URL de Odoo por defecto en el login
npm install
npm run dev                  # http://localhost:3000
npm run build && npm start   # producción (requiere HTTPS para la cookie de sesión)
```
