# VyOS スキル

## 基本操作

### Configモードへの移行
```
configure
```

### Configモードからの抜け方
```
commit
exit
```

### 設定の保存
```
save
```

## インターフェース設定

### IPアドレス設定
```
set interfaces ethernet eth0 address 192.168.1.1/24
set interfaces ethernet eth0 description 'LAN Interface'
commit
```

### VLAN設定
```
set interfaces ethernet eth0 vif 10 address 192.168.10.1/24
set interfaces ethernet eth0 vif 10 description 'VLAN 10'
commit
```

## ルーティング設定

### スタティックルート
```
set protocols static route 0.0.0.0/0 next-hop 192.168.1.254
commit
```

### OSPF設定
```
set protocols ospf area 0 network 192.168.1.0/24
set protocols ospf parameters router-id 1.1.1.1
commit
```

## NAT設定

### ソースNAT (マスカレード)
```
set nat source rule 100 outbound-interface eth0
set nat source rule 100 source address 192.168.1.0/24
set nat source rule 100 translation address masquerade
commit
```

### デスティネーションNAT (ポートフォワーディング)
```
set nat destination rule 10 destination port 80
set nat destination rule 10 inbound-interface eth0
set nat destination rule 10 translation address 192.168.1.100
set nat destination rule 10 translation port 80
commit
```

## ファイアウォール設定

### ファイアウォールルール
```
set firewall name WAN-LOCAL default-action drop
set firewall name WAN-LOCAL rule 10 action accept
set firewall name WAN-LOCAL rule 10 state established enable
set firewall name WAN-LOCAL rule 10 state related enable
set interfaces ethernet eth0 firewall local name WAN-LOCAL
commit
```

## DHCP設定

### DHCPサーバー
```
set service dhcp-server shared-network-name LAN subnet 192.168.1.0/24 default-router 192.168.1.1
set service dhcp-server shared-network-name LAN subnet 192.168.1.0/24 dns-server 8.8.8.8
set service dhcp-server shared-network-name LAN subnet 192.168.1.0/24 range 0 start 192.168.1.100
set service dhcp-server shared-network-name LAN subnet 192.168.1.0/24 range 0 stop 192.168.1.200
commit
```

## VPN設定

### IPsec VPN
```
set vpn ipsec ike-group IKE proposal 1 encryption aes256
set vpn ipsec ike-group IKE proposal 1 hash sha256
set vpn ipsec esp-group ESP proposal 1 encryption aes256
set vpn ipsec esp-group ESP proposal 1 hash sha256
set vpn ipsec site-to-site peer 203.0.113.1 authentication mode pre-shared-secret
set vpn ipsec site-to-site peer 203.0.113.1 authentication pre-shared-secret 'secret123'
set vpn ipsec site-to-site peer 203.0.113.1 ike-group IKE
set vpn ipsec site-to-site peer 203.0.113.1 local-address 198.51.100.1
set vpn ipsec site-to-site peer 203.0.113.1 tunnel 1 esp-group ESP
set vpn ipsec site-to-site peer 203.0.113.1 tunnel 1 local prefix 192.168.1.0/24
set vpn ipsec site-to-site peer 203.0.113.1 tunnel 1 remote prefix 10.0.0.0/24
commit
```
