# ccna

Simulador interactivo de Redes e Infraestructura CCNA — construido con **React + Vite + Tailwind CSS**, optimizado para desplegar en **Vercel**.

## Qué hace

- **Generador dinámico de laboratorios**: tickets de soporte infinitos basados en escenarios de la vida real (básico / intermedio / avanzado / sorpresa) con IPs, VLANs, interfaces caídas, nombres de dispositivos y topologías variables (sitios con o sin firewall, con o sin planta nueva de Contabilidad).
- **Modo Construcción (cableado estilo Packet Tracer)**: laboratorios de diseño con topología dinámica — edificio/piso nuevo o área WiFi, con 2–6 equipos variados (PC, **servidor**, **cámara IP**, **laptop**) y una VLAN nueva. Eliges el tipo de cable (automático / directo / cruzado, con validación), haces clic a un equipo y eliges el puerto; luego configuras por CLI VLANs, troncal 802.1Q, puertos de acceso, gateway (SVI), **SSIDs del AP** y ruta de regreso. Los equipos se pueden **arrastrar**.
- **Ejercicios de configuración (200-301)**: tareas de configuración con verificación — **acceso seguro** (`enable secret`, contraseñas de consola/VTY y **SSH**), **NTP**, **DHCP** (`ip dhcp pool`), **ACL extendida** (`... eq 80`), **EtherChannel LACP**, **STP guards** (BPDU/root/loop), **DHCP snooping + Dynamic ARP Inspection** e **IPv6** (direccionamiento y ruta estática).
- **Tipos de dispositivo**: routers, switches L2/L3, **firewalls**, **servidores**, **cámaras IP**, **Access Points con SSIDs (WiFi)**, PCs y laptops inalámbricas, todos con ícono propio y consola.
- **Interfaz gráfica de equipos finales**: al abrir una PC/servidor/laptop aparece una ventana estilo **Windows** y al abrir una **cámara IP** un **panel web** (`http://…/admin`) para configurar IP/máscara/puerta de enlace y diagnosticar (ipconfig/ping); la CLI sigue disponible con un clic.
- **Edición del diagrama**: el botón **✋ Mover** habilita arrastrar los equipos (si no está activo, no se mueven); **🧹 Acomodar** repone posiciones.
- **Fallas simuladas (29 tipos, solo temas de CCNA 200-301)**: VLANs/trunking 802.1Q mal configurados (**VLAN nativa distinta**, **encapsulación incorrecta**), puertos en `shutdown`, enlaces bloqueados por STP, rutas estáticas u OSPF faltantes, **NAT con inside/outside mal aplicadas**, **ACL que filtran tráfico**, **port-security (`err-disabled`)**, **cable cortado (se reemplaza con 🔌)**, y **equipos mal configurados**: restablecidos de fábrica, **IP duplicada**, **IP fuera del segmento** y **puerta de enlace incorrecta** (PC, servidor y cámara).
- **Motor de red real**: dominios L2 por VLAN (bridging + troncales + SVIs), ruteo LPM con tablas conectadas/estáticas/OSPF, pings bidireccionales con NAT en R1 y validación de objetivos en vivo.
- **Topología SVG interactiva**: cables verde (UP/UP), rojo (down/shutdown), naranja (STP bloqueado, VLAN mismatch, cable dañado) y **animación de datos fluyendo por los enlaces activos**, que se actualizan **en tiempo real con cada comando**.
- **CLI Cisco IOS**: modos user/privilegiado/config/config-if/vlan/router, `no shutdown`, `interface`, `ip address`, `switchport mode/access vlan/trunk allowed|native vlan|encapsulation dot1q`, `switchport port-security`, `spanning-tree portfast`, `access-list` + `ip access-group` (con protocolo y `eq <puerto>`), `ip nat inside|outside`, `channel-group <n> mode active`, `spanning-tree bpduguard|guard root|guard loop`, `ip dhcp snooping [vlan X]`, `ip arp inspection vlan X`, `ipv6 address .../prefix`, `ipv6 route ...`, `ssid <nombre> vlan <id>` (AP), `enable secret`, `username ... secret`, `crypto key generate rsa`, `line console|vty` + `password`/`login`/`transport input ssh`, `ntp server <ip>`, `ip dhcp pool` + `network`/`default-router`, `ip route`, `router ospf`, `show ip interface brief`, `show ip route`, `show vlan brief`, `show interfaces trunk`, `show interface <puerto> switchport`, `show spanning-tree`, `show ip arp`, `show access-lists`, `show port-security`, `show wlan`, `show ip nat translations`, `show cdp neighbors`, `show lldp neighbors`, `show ntp status`, `show ip dhcp binding`, `show etherchannel summary`, `show ipv6 interface brief`, `show ipv6 route`, `show ip dhcp snooping`, `show ip arp inspection`, `show running-config`, `copy running-config startup-config`, `ping`, consolas de equipos (`ipconfig`, `ip`, `ping`).
- **Mentoring**: botón "Pedir Pista" (indicios progresivos que no revelan la respuesta) y "Ver Solución" (lista exacta de comandos IOS para ESE laboratorio).
- **Validación y persistencia**: "Validar Laboratorio" corre todos los pings y puntúa con penalizaciones por pistas/solución. La racha/estadísticas **y el laboratorio en curso** (equipos, cables, configuración, pistas, avance y consolas) se guardan en `localStorage`: al recargar la página (F5) o volver, continúas exactamente donde estabas.

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
scripts/
└── audit-ui.mjs             # Auditoría de UI con Playwright (solapamientos, popup, errores)
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
npm run audit:ui # auditoría de UI con Playwright (solapamientos, popup, errores de runtime)
```

## Despliegue en Vercel

`vercel.json` ya declara framework Vite, `npm run build` y `dist` como salida.
Sube este repo a GitHub e impórtalo en [vercel.com/new](https://vercel.com/new): cada push a `main` se despliega automáticamente.
