package be.pxl.healthcareapi.domein;

import org.jspecify.annotations.Nullable;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.List;

public class PersonDetails implements UserDetails {
    private final Person person;

    public PersonDetails(Person person) {
        this.person = person;
    }
    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_" + person.getRole().name())
        );
    }

    @Override
    public @Nullable String getPassword() {
        return person.getPassword();
    }

    @Override
    public String getUsername() {
        return person.getId().toString();
    }
}
