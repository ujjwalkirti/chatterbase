function getBrowser(): string {
    const ua = navigator.userAgent;
    if (ua.includes("Firefox")) return "Firefox";
    if (ua.includes("Edg")) return "Edge";
    if (ua.includes("Chrome") && !ua.includes("Edg")) return "Chrome";
    if (ua.includes("Safari") && !ua.includes("Chrome")) return "Safari";
    return "Unknown";
}

function getDeviceType(): string {
    const ua = navigator.userAgent;
    if (/Mobi|Android/i.test(ua)) return "Mobile";
    if (/Tablet|iPad/i.test(ua)) return "Tablet";
    return "Desktop";
}

function getOS(): string {
    const userAgent = navigator.userAgent || navigator.vendor;

    if (/windows phone/i.test(userAgent)) return "Windows Phone";
    if (/android/i.test(userAgent)) return "Android";
    if (/iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream) return "iOS";
    if (/Win/i.test(userAgent)) return "Windows";
    if (/Mac/i.test(userAgent)) return "macOS";
    if (/Linux/i.test(userAgent)) return "Linux";

    return "Unknown";
}



export { getBrowser, getDeviceType, getOS };
