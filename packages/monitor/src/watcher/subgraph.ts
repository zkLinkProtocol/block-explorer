export async function findETHMasterListAndAmount() {
    const querySql = `
      query MyQuery {
  holders(where: {accountType: master}) {
    accountType
    balance
    id
  }
  _meta {
    block {
      number
    }
  }
}
    `
    const body = {
        query: querySql,
    };
    try {
        const response = await fetch("https://api.studio.thegraph.com/query/71364/zkl/version/latest", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify(body),
        });
        const data = await response.json();
        data.holders.push({
                balance: '41120000000000000000000000',
                accountType: 'master',
                id: '0x2dc1a672dc57cc8f115ff04ade40d2e507e05609'
            });
        data.holders.push({
                balance: '24400633000000000000000000',
                accountType: 'master',
                id: '0xfc9a15305cac5f42794def87e63f19f0eb6c4cfe'
            });
        return data;
    }catch (err){
        return {
            holders:  [
                {
                    balance: '41120000000000000000000000',
                    accountType: 'master',
                    id: '0x2dc1a672dc57cc8f115ff04ade40d2e507e05609'
                },
                {
                    balance: '24400633000000000000000000',
                    accountType: 'master',
                    id: '0xfc9a15305cac5f42794def87e63f19f0eb6c4cfe'
                },
                {
                    accountType: 'master',
                    balance: '553387922259981012109654',
                    id: '0x0d0707963952f2fba59dd06f2b425ace40b492fe'
                },
                {
                    accountType: 'master',
                    balance: '813607888249210961000000',
                    id: '0x1ab4973a48dc892cd9971ece8e01dcc7688f8f23'
                },
                {
                    accountType: 'master',
                    balance: '12000000000000000000000000',
                    id: '0x293c68ce1e1e79aaa7880e7d41f5984fe1665ee8'
                },
                {
                    accountType: 'master',
                    balance: '4944053098371885534048373',
                    id: '0x4c574ff0aa0cacb33142cbd7435ae5132ca1f66a'
                },
                {
                    accountType: 'master',
                    balance: '82113358507925200000000',
                    id: '0x5569fd6991d1802dbee9bdd67e763fe7be67c7a9'
                },
                {
                    accountType: 'master',
                    balance: '419436227218042893189492',
                    id: '0x58edf78281334335effa23101bbe3371b6a36a51'
                },
                {
                    accountType: 'master',
                    balance: '3079542634506354385160',
                    id: '0x75e89d5979e4f6fba9f97c104c2f0afb3f1dcb88'
                },
                {
                    accountType: 'master',
                    balance: '1321676542000000000000',
                    id: '0x8d1f2ebfaccf1136db76fdd1b86f1dede2d23852'
                },
                {
                    accountType: 'master',
                    balance: '6240000000000000000000000',
                    id: '0xd0af224641a7ea8cfc88df6ed2c7133c6be16939'
                },
                {
                    accountType: 'master',
                    balance: '678338654900357766392685',
                    id: '0xd1669ac6044269b59fa12c5822439f609ca54f41'
                },
                {
                    accountType: 'master',
                    balance: '19509907941599288610248726',
                    id: '0xf89d7b9c864f589bbf53a82105107622b35eaa40'
                }
            ],
            _meta: { block: { number: 21038313 } }
        };
    }
}