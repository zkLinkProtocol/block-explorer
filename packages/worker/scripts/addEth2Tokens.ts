/*
INSERT INTO public.tokens(
    symbol, name, decimals, "blockNumber", "l2Address",
	"l1Address", 
	"transactionHash", 
	"logIndex")
	VALUES ('ETH', 'Ether', 18, 0, '\x000000000000000000000000000000000000800A', 
			'\x0000000000000000000000000000000000000000', 
			((SELECT hash FROM transactions WHERE number = 1)), 
			1);
            */