package com.ridex.places;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface SavedPlaceRepository extends JpaRepository<SavedPlace, String> {

    List<SavedPlace> findByRiderIdOrderByLabelAsc(String riderId);

    /** Scoped by rider: an ownership check nobody can forget to write. */
    Optional<SavedPlace> findByIdAndRiderId(String id, String riderId);

    Optional<SavedPlace> findByRiderIdAndLabelIgnoreCase(String riderId, String label);
}
