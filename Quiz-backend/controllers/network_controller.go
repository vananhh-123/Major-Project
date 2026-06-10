package controllers

import (
	"net"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

func GetNetworkInfo(c *gin.Context) {
	hostIP := detectLocalIPv4()
	if hostIP == "" {
		hostIP = "127.0.0.1"
	}

	c.JSON(http.StatusOK, gin.H{
		"hostIp": hostIP,
	})
}

func detectLocalIPv4() string {
	interfaces, err := net.Interfaces()
	if err != nil {
		return ""
	}

	var fallbackPrivate string

	for _, iface := range interfaces {
		if iface.Flags&net.FlagUp == 0 || iface.Flags&net.FlagLoopback != 0 {
			continue
		}

		addrs, err := iface.Addrs()
		if err != nil {
			continue
		}

		for _, addr := range addrs {
			var ip net.IP
			switch value := addr.(type) {
			case *net.IPNet:
				ip = value.IP
			case *net.IPAddr:
				ip = value.IP
			}

			if ip == nil || ip.IsLoopback() {
				continue
			}

			ip = ip.To4()
			if ip == nil {
				continue
			}

			ipStr := ip.String()
			if strings.HasPrefix(ipStr, "169.254.") {
				continue
			}

			if strings.HasPrefix(ipStr, "192.168.") {
				return ipStr
			}

			if strings.HasPrefix(ipStr, "10.106.") {
				if fallbackPrivate == "" {
					fallbackPrivate = ipStr
				}
				continue
			}

			if fallbackPrivate == "" && strings.HasPrefix(ipStr, "10.") {
				fallbackPrivate = ipStr
			}

		}
	}

	if fallbackPrivate != "" {
		return fallbackPrivate
	}

	return ""
}
