-- get all signed up users
select * from auth.users;

-- handle user confirmed for recording user in the user_profiles after the sign up confirmation
-- v1.0
declare
user_handle text;
begin
  -- Extract part before @ from email
  user_handle := split_part(new.email, '@', 1);

  -- Insert into your table
insert into public.user_profiles (user_id, handle)
values (new.id, user_handle);

return new;
end;
-- v2.0 (username sanitization)
declare
user_handle text;
begin
  -- Extract part before @ from email
  user_handle := split_part(new.email, '@', 1);

  -- Sanitize: keep only alphanumeric characters
  user_handle := regexp_replace(user_handle, '[^a-zA-Z0-9]', '', 'g');

  -- Insert into your table
insert into public.user_profiles (user_id, handle)
values (new.id, user_handle);

return new;
end;