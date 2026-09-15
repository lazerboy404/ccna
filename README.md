# ccna

Simulador interactivo de Redes e Infraestructura CCNA — construido con **React + Vite + Tailwind CSS**, optimizado para desplegar en **Vercel**.

## Qué hace

- **Generador dinámico de laboratorios**: tickets de soporte infinitos basados en escenarios de la vida real (básico / intermedio / avanzado / sorpresa) con IPs, VLANs, interfaces caídas, nombres de dispositivos y topologías variables (sitios con o sin firewall, con o sin planta nueva de Contabilidad).
- **Modo Construcción (cableado estilo Packet Tracer)**: laboratorios de diseño con topología dinámica — edificio/piso nuevo o área WiFi, con 2–6 equipos variados (PC, **servidor**, **cámara IP**, **laptop**) y una VLAN nueva. Eliges el tipo de cable (automático / directo / cruzado, con validación), haces clic a un equipo y eliges el puerto; luego configuras por CLI VLANs, troncal 802.1Q, puertos de acceso, gateway (SVI), **SSIDs del AP** y ruta de regreso. Los equipos se pueden **arrastrar**.
- **Tipos de dispositivo**: routers, switches L2/L3, **firewalls**, **servidores**, **cámaras IP**, **Access Points con SSIDs (WiFi)**, PCs y laptops inalámbricas, todos con ícono propio y consola.
- **Fallas simuladas**: VLANs/trunking 802.1Q mal configurados, puertos en `shutdown`, enlaces bloqueados por STP, subredes/IPs incorrectas, rutas estáticas o procesos OSPF faltantes, puertos de PC aislados, **ACL que filtran tráfico**, **puertos en `err-disabled` por port-security**, **servidor en VLAN equivocada** y **cámara IP caída** (18 tipos).
- **Motor de red real**: dominios L2 por VLAN (bridging + troncales + SVIs), ruteo LPM con tablas conectadas/estáticas/OSPF, pings bidireccionales con NAT en R1 y validación de objetivos en vivo.
- **Topología SVG interactiva**: cables verde (UP/UP), rojo (down/shutdown) y naranja (STP bloqueado o VLAN mismatch) que se actualizan **en tiempo real con cada comando**.
- **CLI Cisco IOS**: modos user/privilegiado/config/config-if/vlan/router, `no shutdown`, `interface`, `ip address`, `switchport mode/access vlan/trunk allowed`, `switchport port-security`, `spanning-tree portfast`, `access-list` + `ip access-group`, `ssid <nombre> vlan <id>` (AP), `ip route`, `router ospf`, `show ip interface brief`, `show ip route`, `show vlan brief`, `show interfaces trunk`, `show spanning-tree`, `show ip arp`, `show access-lists`, `show port-security`, `show wlan`, `show running-config`, `ping`, consolas de equipos (`ipconfig`, `ip`, `ping`).
- **Mentoring**: botón "Pedir Pista" (indicios progresivos que no revelan la respuesta) y "Ver Solución" (lista exacta de comandos IOS para ESE laboratorio).
- **Validación y persistencia**: "Validar Laboratorio" corre todos los pings, puntúa con penalizaciones por pistas/solución, y guarda racha y estadísticas en `localStorage`.

## Estructura

```
src/
├── components/
│   ├── TopologyCanvas.jsx   # Mapa interactivo de red (SVG, colores dinámicos)
│   ├── TerminalCLI.jsx      # Consola de comandos Cisco IOS por dispositivo
│   ├── TicketPanel.jsx      # Ticket, objetivos, pistas, solución y estadísticas
│   ├── Header.jsx           # Barra superior (dificultad + acciones)
│   ├── ValidationModal.jsx  # Resultado de "Validar Laboratorio"
│   └── Toasts.jsx           # Notificaciones
├── context/
│   └── NetworkContext.jsx   # Estado global en tiempo real (lab, CLI, stats)
├── lib/
│   ├── utils.js             # Helpers de IP, RNG determinista, formato
│   ├── labGenerator.js      # Generador de escenarios, dispositivos, fallas
│   ├── buildGenerator.js    # Generador de labs de construcción (topología dinámica + cableado)
│   ├── engine.js            # Motor de red (L2/L3, pings, validación)
│   └── cli.js               # Parser y comandos Cisco IOS
├── App.jsx
├── main.jsx
└── index.css                # Tailwind + estilos de la terminal y enlaces
test/
└── engine.test.mjs          # Tests del motor, generador y CLI (node --test)
legacy/
└── index.html               # Versión original de un solo archivo (referencia)
```

## Desarrollo local

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # genera dist/ listo para producción
npm run preview  # sirve el build localmente
npm test         # suite del motor/generador/CLI (node --test)
```

## Despliegue en Vercel

`vercel.json` ya declara framework Vite, `npm run build` y `dist` como salida.
Sube este repo a GitHub e impórtalo en [vercel.com/new](https://vercel.com/new): cada push a `main` se despliega automáticamente.
