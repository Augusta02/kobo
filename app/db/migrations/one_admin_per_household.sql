create unique index one_admin_per_household 
on members (household_id)
where is_admin;