using Microsoft.EntityFrameworkCore;
using TechStore.Core.Entities;
using TechStore.Core.Enums;

namespace TechStore.Infrastructure.Data;

/// <summary>
/// Carga los datos iniciales de la aplicación.
///
/// Archivo generado por gen_seed.py a partir de catalog.py (fuente única del
/// catálogo). Precios en colones (CRC) con IVA incluido.
///
/// Cada bloque verifica su propia tabla de forma independiente (idempotente).
/// </summary>
public static class SeedData
{
    public const string AdminEmail = "admin@techstore.com";
    public const string AdminPassword = "Admin123!";

    private static readonly string[] Brands =
    {
            "ASUS",
            "Lenovo",
            "HP",
            "Dell",
            "Acer",
            "Apple",
            "Samsung",
            "Xiaomi",
            "Motorola",
            "Logitech",
            "Razer",
            "Corsair",
            "HyperX",
            "JBL",
            "Sony",
            "Kingston",
            "Western Digital",
            "SanDisk",
            "AMD",
            "MSI",
            "LG",
            "TP-Link",
            "Huawei",
            "Anker",
            "Nintendo",
            "Microsoft"
    };

    private static readonly (string Name, string Description)[] Categories =
    {
            ("Laptops", "Computadoras portátiles para estudio, trabajo y gaming"),
            ("Smartphones", "Teléfonos inteligentes de las mejores marcas"),
            ("Tablets", "Tabletas para entretenimiento y productividad"),
            ("Monitores", "Monitores para oficina, diseño y gaming"),
            ("Periféricos", "Teclados, mouse y cámaras web"),
            ("Audio", "Audífonos, parlantes y headsets"),
            ("Componentes", "Procesadores, tarjetas gráficas, memorias y más"),
            ("Almacenamiento", "Discos SSD, discos externos y memorias"),
            ("Gaming", "Consolas y controles"),
            ("Redes", "Routers, sistemas mesh y switches"),
            ("Smartwatches", "Relojes inteligentes y bandas de actividad"),
            ("Accesorios", "Cargadores, baterías, hubs y mochilas")
    };

    private static readonly (string Name, string Category, string Brand, decimal Price, int Stock, string Description, string Specs)[] Products =
    {
            ("ASUS TUF Gaming F15", "Laptops", "ASUS", 549900m, 12, "Laptop gamer resistente con gráficos RTX para jugar y crear contenido.", "{\"Procesador\": \"Intel Core i5-12500H\", \"RAM\": \"16 GB DDR4\", \"Almacenamiento\": \"512 GB SSD NVMe\", \"Gráficos\": \"NVIDIA RTX 3050 4 GB\", \"Pantalla\": \"15.6\\\" FHD 144 Hz\"}"),
            ("Lenovo IdeaPad Slim 3 15", "Laptops", "Lenovo", 299900m, 25, "Laptop delgada y liviana, ideal para estudiantes y teletrabajo.", "{\"Procesador\": \"AMD Ryzen 5 7520U\", \"RAM\": \"8 GB LPDDR5\", \"Almacenamiento\": \"512 GB SSD\", \"Pantalla\": \"15.6\\\" FHD IPS\", \"Batería\": \"Hasta 10 horas\"}"),
            ("HP Victus 15", "Laptops", "HP", 459900m, 15, "Laptop para gaming de entrada con excelente relación precio-rendimiento.", "{\"Procesador\": \"AMD Ryzen 5 7535HS\", \"RAM\": \"8 GB DDR5\", \"Almacenamiento\": \"512 GB SSD\", \"Gráficos\": \"NVIDIA RTX 2050 4 GB\", \"Pantalla\": \"15.6\\\" FHD 144 Hz\"}"),
            ("Apple MacBook Air 13 M2", "Laptops", "Apple", 599900m, 10, "Laptop ultradelgada con chip M2, silenciosa y con batería para todo el día.", "{\"Chip\": \"Apple M2 (8 núcleos)\", \"RAM\": \"8 GB unificada\", \"Almacenamiento\": \"256 GB SSD\", \"Pantalla\": \"13.6\\\" Liquid Retina\", \"Batería\": \"Hasta 18 horas\"}"),
            ("Dell Inspiron 15 3530", "Laptops", "Dell", 429900m, 14, "Laptop confiable para oficina con teclado numérico y 16 GB de RAM.", "{\"Procesador\": \"Intel Core i5-1335U\", \"RAM\": \"16 GB DDR4\", \"Almacenamiento\": \"512 GB SSD\", \"Pantalla\": \"15.6\\\" FHD 120 Hz\", \"Sistema\": \"Windows 11 Home\"}"),
            ("Acer Aspire 5", "Laptops", "Acer", 339900m, 18, "Laptop versátil con chasis metálico y lector de huellas.", "{\"Procesador\": \"Intel Core i5-1235U\", \"RAM\": \"8 GB DDR4\", \"Almacenamiento\": \"512 GB SSD\", \"Pantalla\": \"15.6\\\" FHD IPS\", \"Sistema\": \"Windows 11 Home\"}"),
            ("ASUS ROG Strix G16", "Laptops", "ASUS", 1099900m, 6, "Laptop gamer de alto rendimiento con RTX 4060 y pantalla de 165 Hz.", "{\"Procesador\": \"Intel Core i7-13650HX\", \"RAM\": \"16 GB DDR5\", \"Almacenamiento\": \"1 TB SSD NVMe\", \"Gráficos\": \"NVIDIA RTX 4060 8 GB\", \"Pantalla\": \"16\\\" FHD+ 165 Hz\"}"),
            ("Lenovo Legion 5", "Laptops", "Lenovo", 999900m, 7, "Laptop gamer con refrigeración avanzada y teclado RGB.", "{\"Procesador\": \"AMD Ryzen 7 7840HS\", \"RAM\": \"16 GB DDR5\", \"Almacenamiento\": \"1 TB SSD\", \"Gráficos\": \"NVIDIA RTX 4060 8 GB\", \"Pantalla\": \"16\\\" WQXGA 165 Hz\"}"),
            ("HP 15 fd0000", "Laptops", "HP", 259900m, 30, "Laptop económica para tareas diarias, clases virtuales y ofimática.", "{\"Procesador\": \"Intel Core i3-1315U\", \"RAM\": \"8 GB DDR4\", \"Almacenamiento\": \"512 GB SSD\", \"Pantalla\": \"15.6\\\" FHD\", \"Sistema\": \"Windows 11 Home\"}"),
            ("Apple MacBook Pro 14 M3", "Laptops", "Apple", 1049900m, 3, "Laptop profesional con chip M3 y pantalla Liquid Retina XDR.", "{\"Chip\": \"Apple M3 (8 núcleos)\", \"RAM\": \"8 GB unificada\", \"Almacenamiento\": \"512 GB SSD\", \"Pantalla\": \"14.2\\\" Liquid Retina XDR\", \"Batería\": \"Hasta 22 horas\"}"),
            ("Samsung Galaxy S24 Ultra 256GB", "Smartphones", "Samsung", 699900m, 9, "Teléfono insignia con S Pen integrado, cámara de 200 MP y Galaxy AI.", "{\"Pantalla\": \"6.8\\\" Dynamic AMOLED 2X 120 Hz\", \"Procesador\": \"Snapdragon 8 Gen 3\", \"RAM\": \"12 GB\", \"Almacenamiento\": \"256 GB\", \"Cámara\": \"200 MP + 50 MP + 12 MP + 10 MP\"}"),
            ("Samsung Galaxy A55 5G 256GB", "Smartphones", "Samsung", 229900m, 20, "Gama media premium con cuerpo de metal y vidrio, resistente al agua IP67.", "{\"Pantalla\": \"6.6\\\" Super AMOLED 120 Hz\", \"Procesador\": \"Exynos 1480\", \"RAM\": \"8 GB\", \"Almacenamiento\": \"256 GB\", \"Cámara\": \"50 MP OIS\"}"),
            ("Samsung Galaxy A15 128GB", "Smartphones", "Samsung", 99900m, 35, "Teléfono accesible con pantalla Super AMOLED y batería de 5000 mAh.", "{\"Pantalla\": \"6.5\\\" Super AMOLED 90 Hz\", \"RAM\": \"4 GB\", \"Almacenamiento\": \"128 GB\", \"Cámara\": \"50 MP\", \"Batería\": \"5000 mAh\"}"),
            ("Apple iPhone 15 128GB", "Smartphones", "Apple", 479900m, 12, "Dynamic Island, cámara de 48 MP y conector USB-C.", "{\"Pantalla\": \"6.1\\\" Super Retina XDR\", \"Chip\": \"A16 Bionic\", \"Almacenamiento\": \"128 GB\", \"Cámara\": \"48 MP + 12 MP\", \"Conector\": \"USB-C\"}"),
            ("Apple iPhone 15 Pro Max 256GB", "Smartphones", "Apple", 799900m, 5, "Diseño en titanio, chip A17 Pro y zoom óptico 5x.", "{\"Pantalla\": \"6.7\\\" Super Retina XDR ProMotion\", \"Chip\": \"A17 Pro\", \"Almacenamiento\": \"256 GB\", \"Cámara\": \"48 MP + 12 MP + 12 MP (5x)\", \"Material\": \"Titanio\"}"),
            ("Xiaomi Redmi Note 13 Pro 256GB", "Smartphones", "Xiaomi", 179900m, 22, "Cámara de 200 MP y carga rápida de 67 W a precio accesible.", "{\"Pantalla\": \"6.67\\\" AMOLED 120 Hz\", \"Procesador\": \"Snapdragon 7s Gen 2\", \"RAM\": \"8 GB\", \"Almacenamiento\": \"256 GB\", \"Carga\": \"67 W\"}"),
            ("Motorola Moto G84 256GB", "Smartphones", "Motorola", 149900m, 16, "Pantalla pOLED de 120 Hz, sonido Dolby Atmos y acabado en cuero vegano.", "{\"Pantalla\": \"6.55\\\" pOLED 120 Hz\", \"Procesador\": \"Snapdragon 695\", \"RAM\": \"12 GB\", \"Almacenamiento\": \"256 GB\", \"Batería\": \"5000 mAh\"}"),
            ("Xiaomi Redmi 13C 128GB", "Smartphones", "Xiaomi", 74900m, 40, "Teléfono de entrada con pantalla grande y batería de larga duración.", "{\"Pantalla\": \"6.74\\\" HD+ 90 Hz\", \"RAM\": \"4 GB\", \"Almacenamiento\": \"128 GB\", \"Cámara\": \"50 MP\", \"Batería\": \"5000 mAh\"}"),
            ("Apple iPad 10 64GB WiFi", "Tablets", "Apple", 259900m, 11, "Tableta con pantalla Liquid Retina de 10.9\" y chip A14 Bionic.", "{\"Pantalla\": \"10.9\\\" Liquid Retina\", \"Chip\": \"A14 Bionic\", \"Almacenamiento\": \"64 GB\", \"Conectividad\": \"WiFi 6\", \"Conector\": \"USB-C\"}"),
            ("Samsung Galaxy Tab S9 FE 128GB", "Tablets", "Samsung", 249900m, 9, "Tableta resistente al agua con S Pen incluido.", "{\"Pantalla\": \"10.9\\\" TFT 90 Hz\", \"Procesador\": \"Exynos 1380\", \"RAM\": \"6 GB\", \"Almacenamiento\": \"128 GB\", \"Accesorio\": \"S Pen incluido\"}"),
            ("Samsung Galaxy Tab A9+ 64GB", "Tablets", "Samsung", 139900m, 18, "Tableta de 11\" para entretenimiento con cuatro parlantes.", "{\"Pantalla\": \"11\\\" 90 Hz\", \"Procesador\": \"Snapdragon 695\", \"RAM\": \"4 GB\", \"Almacenamiento\": \"64 GB\", \"Audio\": \"4 parlantes\"}"),
            ("Lenovo Tab M10 Plus 128GB", "Tablets", "Lenovo", 119900m, 14, "Tableta 2K ideal para estudio y lectura con modo para niños.", "{\"Pantalla\": \"10.61\\\" 2K IPS\", \"Procesador\": \"Snapdragon 680\", \"RAM\": \"4 GB\", \"Almacenamiento\": \"128 GB\", \"Batería\": \"7700 mAh\"}"),
            ("LG UltraGear 24GN60R 24\" 144Hz", "Monitores", "LG", 99900m, 20, "Monitor gamer IPS de 144 Hz y 1 ms con AMD FreeSync.", "{\"Tamaño\": \"23.8\\\"\", \"Resolución\": \"1920 × 1080\", \"Panel\": \"IPS\", \"Frecuencia\": \"144 Hz\", \"Respuesta\": \"1 ms\"}"),
            ("Samsung Odyssey G5 27\" QHD Curvo", "Monitores", "Samsung", 169900m, 10, "Monitor curvo QHD de 165 Hz para una experiencia inmersiva.", "{\"Tamaño\": \"27\\\"\", \"Resolución\": \"2560 × 1440\", \"Panel\": \"VA curvo 1000R\", \"Frecuencia\": \"165 Hz\", \"Respuesta\": \"1 ms\"}"),
            ("ASUS ProArt PA278QV 27\"", "Monitores", "ASUS", 229900m, 8, "Monitor profesional calibrado de fábrica para diseño y fotografía.", "{\"Tamaño\": \"27\\\"\", \"Resolución\": \"2560 × 1440\", \"Panel\": \"IPS\", \"Color\": \"100 % sRGB, ΔE < 2\", \"Ergonomía\": \"Altura, giro y pivote\"}"),
            ("Dell S2721HN 27\" FHD", "Monitores", "Dell", 109900m, 16, "Monitor IPS de bordes ultradelgados para oficina y hogar.", "{\"Tamaño\": \"27\\\"\", \"Resolución\": \"1920 × 1080\", \"Panel\": \"IPS\", \"Frecuencia\": \"75 Hz\", \"Conexiones\": \"2 × HDMI\"}"),
            ("LG 27UP850 27\" 4K", "Monitores", "LG", 279900m, 6, "Monitor 4K con HDR400 y USB-C de 90 W.", "{\"Tamaño\": \"27\\\"\", \"Resolución\": \"3840 × 2160\", \"Panel\": \"IPS\", \"HDR\": \"VESA DisplayHDR 400\", \"USB-C\": \"90 W Power Delivery\"}"),
            ("Logitech MX Master 3S", "Periféricos", "Logitech", 59900m, 30, "Mouse inalámbrico ergonómico con clics silenciosos y sensor de 8000 DPI.", "{\"Sensor\": \"8000 DPI\", \"Conexión\": \"Bluetooth + receptor Logi Bolt\", \"Batería\": \"Hasta 70 días\", \"Peso\": \"141 g\"}"),
            ("Logitech G502 HERO", "Periféricos", "Logitech", 29900m, 40, "Mouse gamer alámbrico con 11 botones programables y pesas ajustables.", "{\"Sensor\": \"HERO 25K\", \"Botones\": \"11 programables\", \"Conexión\": \"USB alámbrico\", \"Iluminación\": \"RGB LIGHTSYNC\"}"),
            ("Logitech G Pro X Superlight 2", "Periféricos", "Logitech", 89900m, 12, "Mouse inalámbrico ultraliviano de 60 g para eSports.", "{\"Sensor\": \"HERO 2 (32 000 DPI)\", \"Peso\": \"60 g\", \"Conexión\": \"LIGHTSPEED inalámbrico\", \"Batería\": \"Hasta 95 horas\"}"),
            ("Razer DeathAdder V3", "Periféricos", "Razer", 44900m, 20, "Mouse gamer ergonómico de 59 g con sensor Focus Pro 30K.", "{\"Sensor\": \"Focus Pro 30K\", \"Peso\": \"59 g\", \"Conexión\": \"USB alámbrico\", \"Switches\": \"Ópticos Gen-3\"}"),
            ("Razer BlackWidow V4", "Periféricos", "Razer", 99900m, 15, "Teclado mecánico gamer con switches Green, rueda multifunción y RGB.", "{\"Switches\": \"Razer Green (clicky)\", \"Formato\": \"Completo\", \"Iluminación\": \"Razer Chroma RGB\", \"Extras\": \"Reposamuñecas magnético\"}"),
            ("Logitech MX Keys S", "Periféricos", "Logitech", 64900m, 18, "Teclado inalámbrico iluminado para productividad multiplataforma.", "{\"Conexión\": \"Bluetooth + Logi Bolt\", \"Iluminación\": \"Retroiluminación inteligente\", \"Batería\": \"Hasta 10 días con luz\", \"Dispositivos\": \"Hasta 3\"}"),
            ("Corsair K70 RGB Pro", "Periféricos", "Corsair", 94900m, 9, "Teclado mecánico con switches Cherry MX y marco de aluminio.", "{\"Switches\": \"Cherry MX Red\", \"Formato\": \"Completo\", \"Polling\": \"8000 Hz\", \"Iluminación\": \"RGB por tecla\"}"),
            ("Logitech MK270 Combo Inalámbrico", "Periféricos", "Logitech", 15900m, 50, "Combo de teclado y mouse inalámbricos para oficina.", "{\"Conexión\": \"Receptor USB 2.4 GHz\", \"Batería teclado\": \"Hasta 24 meses\", \"Batería mouse\": \"Hasta 12 meses\", \"Idioma\": \"Español\"}"),
            ("HyperX Alloy Origins Core", "Periféricos", "HyperX", 54900m, 13, "Teclado mecánico TKL compacto con cuerpo de aluminio.", "{\"Switches\": \"HyperX Red\", \"Formato\": \"Tenkeyless (80 %)\", \"Iluminación\": \"RGB por tecla\", \"Cable\": \"USB-C desmontable\"}"),
            ("Logitech C920 HD Pro", "Periféricos", "Logitech", 44900m, 22, "Cámara web Full HD con micrófonos estéreo para videollamadas.", "{\"Resolución\": \"1080p a 30 fps\", \"Enfoque\": \"Automático\", \"Micrófono\": \"Estéreo\", \"Conexión\": \"USB\"}"),
            ("Sony WH-1000XM5", "Audio", "Sony", 199900m, 2, "Audífonos inalámbricos con la mejor cancelación de ruido de su clase.", "{\"Tipo\": \"Over-ear\", \"Cancelación de ruido\": \"Sí (8 micrófonos)\", \"Batería\": \"Hasta 30 horas\", \"Conexión\": \"Bluetooth 5.2\"}"),
            ("Apple AirPods Pro 2 USB-C", "Audio", "Apple", 139900m, 14, "Audífonos con cancelación activa de ruido y audio espacial.", "{\"Tipo\": \"In-ear\", \"Cancelación de ruido\": \"Activa\", \"Batería\": \"Hasta 30 horas con estuche\", \"Estuche\": \"USB-C con MagSafe\"}"),
            ("JBL Flip 6", "Audio", "JBL", 69900m, 25, "Parlante Bluetooth portátil resistente al agua y polvo IP67.", "{\"Potencia\": \"30 W\", \"Resistencia\": \"IP67\", \"Batería\": \"Hasta 12 horas\", \"Conexión\": \"Bluetooth 5.1\"}"),
            ("JBL Tune 520BT", "Audio", "JBL", 24900m, 35, "Audífonos inalámbricos livianos con sonido JBL Pure Bass.", "{\"Tipo\": \"On-ear\", \"Batería\": \"Hasta 57 horas\", \"Carga rápida\": \"5 min = 3 horas\", \"Conexión\": \"Bluetooth 5.3\"}"),
            ("HyperX Cloud II", "Audio", "HyperX", 49900m, 20, "Headset gamer con sonido envolvente 7.1 y micrófono desmontable.", "{\"Tipo\": \"Over-ear\", \"Sonido\": \"Envolvente virtual 7.1\", \"Micrófono\": \"Desmontable con cancelación de ruido\", \"Conexión\": \"USB / 3.5 mm\"}"),
            ("Corsair HS80 RGB Wireless", "Audio", "Corsair", 74900m, 10, "Headset gamer inalámbrico con audio espacial Dolby Atmos.", "{\"Tipo\": \"Over-ear\", \"Conexión\": \"Inalámbrico SLIPSTREAM\", \"Batería\": \"Hasta 20 horas\", \"Audio\": \"Dolby Atmos\"}"),
            ("Samsung Galaxy Buds2 Pro", "Audio", "Samsung", 89900m, 12, "Audífonos inalámbricos con audio Hi-Fi de 24 bits y cancelación activa.", "{\"Tipo\": \"In-ear\", \"Cancelación de ruido\": \"Activa inteligente\", \"Batería\": \"Hasta 18 horas con estuche\", \"Resistencia\": \"IPX7\"}"),
            ("AMD Ryzen 5 7600", "Componentes", "AMD", 109900m, 15, "Procesador de 6 núcleos para la plataforma AM5 con disipador incluido.", "{\"Núcleos / hilos\": \"6 / 12\", \"Frecuencia\": \"Hasta 5.1 GHz\", \"Socket\": \"AM5\", \"Incluye\": \"Disipador Wraith Stealth\"}"),
            ("AMD Ryzen 7 7800X3D", "Componentes", "AMD", 249900m, 0, "El procesador más rápido para gaming gracias a la tecnología 3D V-Cache.", "{\"Núcleos / hilos\": \"8 / 16\", \"Frecuencia\": \"Hasta 5.0 GHz\", \"Caché\": \"96 MB L3 (3D V-Cache)\", \"Socket\": \"AM5\"}"),
            ("Kingston Fury Beast 32GB DDR5", "Componentes", "Kingston", 64900m, 25, "Kit de memoria RAM DDR5 de 32 GB (2 × 16 GB) a 5200 MT/s.", "{\"Capacidad\": \"32 GB (2 × 16 GB)\", \"Tipo\": \"DDR5\", \"Velocidad\": \"5200 MT/s\", \"Perfiles\": \"Intel XMP 3.0 / AMD EXPO\"}"),
            ("ASUS Dual GeForce RTX 4060 8GB", "Componentes", "ASUS", 189900m, 8, "Tarjeta gráfica con DLSS 3 y trazado de rayos para gaming en 1080p.", "{\"GPU\": \"NVIDIA GeForce RTX 4060\", \"Memoria\": \"8 GB GDDR6\", \"Salidas\": \"3 × DP, 1 × HDMI\", \"Fuente recomendada\": \"550 W\"}"),
            ("MSI B650 Gaming Plus WiFi", "Componentes", "MSI", 119900m, 10, "Tarjeta madre ATX para AM5 con WiFi 6E y soporte DDR5.", "{\"Socket\": \"AM5\", \"Formato\": \"ATX\", \"Memoria\": \"DDR5 hasta 192 GB\", \"Red\": \"WiFi 6E + 2.5 GbE\"}"),
            ("Corsair RM750e 750W 80+ Gold", "Componentes", "Corsair", 69900m, 12, "Fuente de poder modular, silenciosa y con certificación 80 Plus Gold.", "{\"Potencia\": \"750 W\", \"Certificación\": \"80 Plus Gold\", \"Modular\": \"Totalmente modular\", \"Garantía\": \"7 años\"}"),
            ("Samsung 990 Pro 1TB NVMe", "Almacenamiento", "Samsung", 69900m, 18, "SSD PCIe 4.0 de alto rendimiento con lectura de hasta 7450 MB/s.", "{\"Capacidad\": \"1 TB\", \"Interfaz\": \"PCIe 4.0 NVMe M.2\", \"Lectura\": \"7450 MB/s\", \"Escritura\": \"6900 MB/s\"}"),
            ("Kingston NV2 1TB NVMe", "Almacenamiento", "Kingston", 34900m, 40, "SSD NVMe económico para acelerar cualquier computadora.", "{\"Capacidad\": \"1 TB\", \"Interfaz\": \"PCIe 4.0 NVMe M.2\", \"Lectura\": \"3500 MB/s\", \"Escritura\": \"2100 MB/s\"}"),
            ("WD Elements 2TB Externo", "Almacenamiento", "Western Digital", 49900m, 20, "Disco duro externo portátil USB 3.0 para respaldos.", "{\"Capacidad\": \"2 TB\", \"Interfaz\": \"USB 3.0\", \"Formato\": \"2.5\\\" portátil\", \"Compatibilidad\": \"Windows (formateable para Mac)\"}"),
            ("Kingston DataTraveler Exodia 64GB", "Almacenamiento", "Kingston", 4990m, 80, "Memoria USB 3.2 con capuchón protector y llavero.", "{\"Capacidad\": \"64 GB\", \"Interfaz\": \"USB 3.2 Gen 1\", \"Lectura\": \"Hasta 100 MB/s\"}"),
            ("SanDisk Extreme microSD 128GB", "Almacenamiento", "SanDisk", 14900m, 45, "Tarjeta microSD para cámaras, drones y consolas con adaptador SD.", "{\"Capacidad\": \"128 GB\", \"Clase\": \"UHS-I U3, V30, A2\", \"Lectura\": \"Hasta 190 MB/s\", \"Incluye\": \"Adaptador SD\"}"),
            ("PlayStation 5 Slim", "Gaming", "Sony", 289900m, 4, "Consola PS5 Slim con lector de discos y 1 TB de almacenamiento.", "{\"Almacenamiento\": \"1 TB SSD\", \"Resolución\": \"Hasta 4K 120 fps\", \"Lector\": \"Blu-ray Ultra HD\", \"Incluye\": \"Control DualSense\"}"),
            ("Nintendo Switch OLED", "Gaming", "Nintendo", 209900m, 10, "Consola híbrida con pantalla OLED de 7\" y base con puerto LAN.", "{\"Pantalla\": \"7\\\" OLED\", \"Almacenamiento\": \"64 GB\", \"Modos\": \"TV, sobremesa y portátil\", \"Incluye\": \"Joy-Con\"}"),
            ("Xbox Series S 512GB", "Gaming", "Microsoft", 189900m, 8, "Consola totalmente digital, compacta y compatible con Game Pass.", "{\"Almacenamiento\": \"512 GB SSD\", \"Resolución\": \"Hasta 1440p 120 fps\", \"Formato\": \"Digital\", \"Incluye\": \"Control inalámbrico\"}"),
            ("Control DualSense PS5", "Gaming", "Sony", 44900m, 25, "Control inalámbrico con retroalimentación háptica y gatillos adaptativos.", "{\"Compatibilidad\": \"PlayStation 5 / PC\", \"Conexión\": \"Bluetooth / USB-C\", \"Batería\": \"Recargable integrada\"}"),
            ("Control Inalámbrico Xbox", "Gaming", "Microsoft", 39900m, 22, "Control para Xbox Series X|S, Xbox One, PC y móviles.", "{\"Compatibilidad\": \"Xbox / PC / Android / iOS\", \"Conexión\": \"Xbox Wireless / Bluetooth\", \"Batería\": \"2 baterías AA\"}"),
            ("TP-Link Archer AX55 WiFi 6", "Redes", "TP-Link", 49900m, 15, "Router WiFi 6 doble banda de hasta 3000 Mbps.", "{\"Estándar\": \"WiFi 6 (802.11ax)\", \"Velocidad\": \"AX3000\", \"Puertos\": \"4 × Gigabit LAN\", \"Antenas\": \"4 externas\"}"),
            ("TP-Link Deco X20 Mesh (2 pack)", "Redes", "TP-Link", 79900m, 9, "Sistema mesh WiFi 6 para cubrir toda la casa sin zonas muertas.", "{\"Estándar\": \"WiFi 6\", \"Cobertura\": \"Hasta 370 m²\", \"Unidades\": \"2\", \"Dispositivos\": \"Hasta 150\"}"),
            ("TP-Link TL-SG108 Switch 8 puertos", "Redes", "TP-Link", 17900m, 30, "Switch Gigabit de escritorio con carcasa metálica.", "{\"Puertos\": \"8 × Gigabit\", \"Tipo\": \"No administrable\", \"Carcasa\": \"Metálica\"}"),
            ("Apple Watch SE 40mm", "Smartwatches", "Apple", 149900m, 10, "Reloj inteligente con detección de caídas y monitoreo de actividad.", "{\"Pantalla\": \"Retina 40 mm\", \"Sensores\": \"Ritmo cardíaco, acelerómetro\", \"Resistencia\": \"50 m\", \"Batería\": \"Hasta 18 horas\"}"),
            ("Samsung Galaxy Watch6 40mm", "Smartwatches", "Samsung", 129900m, 11, "Reloj con análisis de sueño y composición corporal.", "{\"Pantalla\": \"1.3\\\" Super AMOLED\", \"Sensores\": \"BioActive (ECG, presión)\", \"Resistencia\": \"5 ATM + IP68\", \"Batería\": \"Hasta 40 horas\"}"),
            ("Xiaomi Smart Band 8", "Smartwatches", "Xiaomi", 24900m, 40, "Banda de actividad con pantalla AMOLED y más de 150 modos deportivos.", "{\"Pantalla\": \"1.62\\\" AMOLED\", \"Batería\": \"Hasta 16 días\", \"Resistencia\": \"5 ATM\", \"Modos deportivos\": \"150+\"}"),
            ("Huawei Watch Fit 3", "Smartwatches", "Huawei", 69900m, 12, "Reloj delgado con pantalla AMOLED de 1.82\" y GPS integrado.", "{\"Pantalla\": \"1.82\\\" AMOLED\", \"GPS\": \"Integrado\", \"Batería\": \"Hasta 10 días\", \"Resistencia\": \"5 ATM\"}"),
            ("Anker PowerCore 10000", "Accesorios", "Anker", 17900m, 35, "Batería portátil compacta de 10 000 mAh con carga rápida.", "{\"Capacidad\": \"10 000 mAh\", \"Salida\": \"USB-A 12 W\", \"Peso\": \"180 g\"}"),
            ("Cargador Samsung 25W USB-C", "Accesorios", "Samsung", 12900m, 50, "Cargador de pared con Super Fast Charging de 25 W.", "{\"Potencia\": \"25 W\", \"Puerto\": \"USB-C\", \"Tecnología\": \"Super Fast Charging (PD 3.0 PPS)\"}"),
            ("Mochila HP Prelude 15.6\"", "Accesorios", "HP", 19900m, 25, "Mochila resistente al agua con compartimento acolchado para laptop.", "{\"Compatibilidad\": \"Laptops hasta 15.6\\\"\", \"Material\": \"Repelente al agua\", \"Capacidad\": \"20 L\"}"),
            ("Hub USB-C Anker 7 en 1", "Accesorios", "Anker", 29900m, 20, "Adaptador USB-C con HDMI 4K, lector SD y carga de 100 W.", "{\"Puertos\": \"HDMI 4K, 2 × USB-A, USB-C PD 100 W, SD, microSD\", \"Compatibilidad\": \"Laptops y tablets USB-C\"}")
    };

    /// <param name="resetAdminPassword">
    /// En desarrollo se restablece la contraseña del administrador en cada arranque
    /// para que las credenciales de prueba siempre funcionen. En producción solo se
    /// crea si no existe.
    /// </param>
    public static async Task InitializeAsync(AppDbContext context, bool resetAdminPassword = true)
    {
        await SeedAdminAsync(context, resetAdminPassword);
        await SeedCatalogAsync(context);
        await SeedDiscountRulesAsync(context);
    }

    private static async Task SeedAdminAsync(AppDbContext context, bool resetPassword)
    {
        var admin = await context.Users.FirstOrDefaultAsync(u => u.Email == AdminEmail);

        if (admin == null)
        {
            context.Users.Add(new User
            {
                Id = Guid.NewGuid(),
                FirstName = "Alfredo",
                LastName = "Rodríguez",
                Email = AdminEmail,
                Phone = "2222-0000",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(AdminPassword),
                Role = UserRole.Admin,
                IsActive = true
            });
        }
        else if (resetPassword)
        {
            admin.Role = UserRole.Admin;
            admin.IsActive = true;
            admin.PasswordHash = BCrypt.Net.BCrypt.HashPassword(AdminPassword);
        }

        await context.SaveChangesAsync();
    }

    private static async Task SeedCatalogAsync(AppDbContext context)
    {
        if (await context.Products.AnyAsync())
            return;

        var brands = Brands.ToDictionary(b => b, b => new Brand { Id = Guid.NewGuid(), Name = b });
        context.Brands.AddRange(brands.Values);

        var categories = Categories.ToDictionary(
            c => c.Name,
            c => new Category { Id = Guid.NewGuid(), Name = c.Name, Description = c.Description });
        context.Categories.AddRange(categories.Values);

        var createdAt = DateTime.UtcNow;
        var index = 0;
        foreach (var p in Products)
        {
            context.Products.Add(new Product
            {
                Id = Guid.NewGuid(),
                Name = p.Name,
                Description = p.Description,
                Specifications = p.Specs,
                Price = p.Price,
                Stock = p.Stock,
                CategoryId = categories[p.Category].Id,
                BrandId = brands[p.Brand].Id,
                // Fechas escalonadas para que "Más recientes" tenga un orden estable.
                CreatedAt = createdAt.AddMinutes(-index++)
            });
        }

        await context.SaveChangesAsync();
    }

    private static async Task SeedDiscountRulesAsync(AppDbContext context)
    {
        if (await context.DiscountRules.AnyAsync())
            return;

        var now = DateTime.UtcNow;
        var categoryIds = await context.Categories.ToDictionaryAsync(c => c.Name, c => c.Id);
        var productIds = await context.Products.ToDictionaryAsync(p => p.Name, p => p.Id);

        List<DiscountRuleCategory> Cats(string name) =>
            categoryIds.TryGetValue(name, out var id)
                ? new List<DiscountRuleCategory> { new() { CategoryId = id } }
                : new List<DiscountRuleCategory>();

        List<DiscountRuleProduct> Prods(params string[] names) =>
            names.Where(productIds.ContainsKey)
                 .Select(n => new DiscountRuleProduct { ProductId = productIds[n] })
                 .ToList();

        context.DiscountRules.AddRange(
            new DiscountRule
            {
                Id = Guid.NewGuid(),
                Name = "Cupón TECH20",
                Description = "20 % de descuento con el código TECH20 en compras desde ₡50 000",
                Type = DiscountType.Coupon,
                Value = 20,
                IsPercentage = true,
                CouponCode = "TECH20",
                Priority = 1,
                IsStackable = false,
                StartDate = now.AddDays(-1),
                EndDate = now.AddDays(365),
                MinimumAmount = 50000,
                MaxUses = 50,
                IsActive = true
            },
            new DiscountRule
            {
                Id = Guid.NewGuid(),
                Name = "10 % en Periféricos",
                Description = "Descuento en todos los teclados, mouse y cámaras web",
                Type = DiscountType.Category,
                Value = 10,
                IsPercentage = true,
                Priority = 2,
                IsStackable = true,
                StartDate = now.AddDays(-5),
                EndDate = now.AddDays(365),
                IsActive = true,
                DiscountRuleCategories = Cats("Periféricos")
            },
            new DiscountRule
            {
                Id = Guid.NewGuid(),
                Name = "₡25 000 en compras desde ₡300 000",
                Description = "Descuento fijo para compras grandes",
                Type = DiscountType.FixedAmount,
                Value = 25000,
                IsPercentage = false,
                Priority = 3,
                IsStackable = true,
                StartDate = now.AddDays(-3),
                EndDate = now.AddDays(365),
                MinimumAmount = 300000,
                IsActive = true
            },
            new DiscountRule
            {
                Id = Guid.NewGuid(),
                Name = "15 % llevando 3 o más",
                Description = "Lleva 3 o más unidades del mismo producto y obtén 15 % en ese producto",
                Type = DiscountType.Volume,
                Value = 15,
                IsPercentage = true,
                Priority = 4,
                IsStackable = true,
                MinimumQuantity = 3,
                StartDate = now.AddDays(-3),
                EndDate = now.AddDays(365),
                IsActive = true
            },
            new DiscountRule
            {
                Id = Guid.NewGuid(),
                Name = "Temporada de Laptops",
                Description = "10 % en todas las laptops por tiempo limitado",
                Type = DiscountType.TimeLimited,
                Value = 10,
                IsPercentage = true,
                Priority = 5,
                IsStackable = true,
                StartDate = now.AddDays(-1),
                EndDate = now.AddDays(45),
                IsActive = true,
                DiscountRuleCategories = Cats("Laptops")
            },
            new DiscountRule
            {
                Id = Guid.NewGuid(),
                Name = "Combo Gamer",
                Description = "10 % al llevar mouse G502, teclado BlackWidow V4 y headset Cloud II",
                Type = DiscountType.Bundle,
                Value = 10,
                IsPercentage = true,
                Priority = 6,
                IsStackable = true,
                StartDate = now.AddDays(-1),
                EndDate = now.AddDays(365),
                IsActive = true,
                DiscountRuleProducts = Prods("Logitech G502 HERO", "Razer BlackWidow V4", "HyperX Cloud II")
            },
            new DiscountRule
            {
                Id = Guid.NewGuid(),
                Name = "Oferta Relámpago",
                Description = "15 % en productos seleccionados por tiempo limitado",
                Type = DiscountType.TimeLimited,
                Value = 15,
                IsPercentage = true,
                Priority = 7,
                IsStackable = true,
                StartDate = now.AddDays(-1),
                EndDate = now.AddDays(21),
                IsActive = true,
                DiscountRuleProducts = Prods("JBL Flip 6", "Xiaomi Redmi Note 13 Pro 256GB", "Samsung Galaxy Watch6 40mm", "Nintendo Switch OLED")
            });

        await context.SaveChangesAsync();
    }
}
