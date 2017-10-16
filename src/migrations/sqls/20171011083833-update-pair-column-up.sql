-- Тут все просто
UPDATE trades SET 
	pair = substring(pair FROM 1 for 3) || '-' || substring(pair FROM 4 for 3),
	trade = jsonb_set(trade, '{pair}', jsonb ('"' || substring(pair FROM 1 for 3) || '-' || substring(pair FROM 4 for 3) || '"')),
	books = jsonb_set(jsonb_set(books, '{books,0,pair}', jsonb ('"' || substring(pair FROM 1 for 3) || '-' || substring(pair FROM 4 for 3) || '"')), '{books,1,pair}', jsonb ('"' || substring(pair FROM 1 for 3) || '-' || substring(pair FROM 4 for 3) || '"'));
