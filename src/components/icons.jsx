// Etiquetas de tipo de dispositivo compartidas por la topología y la terminal
export function typeLabel(t) {
  return t === 'isp' ? 'Internet'
    : t === 'firewall' ? 'Firewall'
    : t === 'router' ? 'Router'
    : t === 'l3switch' ? 'Switch L3'
    : t === 'l2switch' ? 'Switch L2'
    : t === 'ap' ? 'Access Point'
    : t === 'server' ? 'Servidor'
    : t === 'camera' ? 'Cámara IP'
    : t === 'wireless' ? 'Cliente WiFi'
    : 'PC'
}
