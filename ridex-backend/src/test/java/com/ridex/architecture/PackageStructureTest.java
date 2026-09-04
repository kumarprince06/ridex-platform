package com.ridex.architecture;

import com.tngtech.archunit.core.domain.JavaClasses;
import com.tngtech.archunit.core.importer.ClassFileImporter;
import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.lang.ArchRule;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;

import org.junit.jupiter.api.Test;

/**
 * The package layout is only a convention until something fails the build over it. These are the
 * three rules that make the feature-first structure real rather than aspirational.
 */
class PackageStructureTest {

    private static final JavaClasses CLASSES = new ClassFileImporter()
            .withImportOption(ImportOption.Predefined.DO_NOT_INCLUDE_TESTS)
            .importPackages("com.ridex");

    @Test
    void domainDoesNotDependOnSpring() {
        // The point of the domain package: fare maths and state machines must be testable without
        // booting a context, which stops being true the moment one of them takes a Spring type.
        ArchRule rule = noClasses()
                .that().resideInAPackage("..domain..")
                .should().dependOnClassesThat().resideInAnyPackage(
                        "org.springframework..", "jakarta.servlet..");

        rule.check(CLASSES);
    }

    @Test
    void domainDoesNotDependOnWebOrPersistenceLayers() {
        // Dependencies point inward. A domain class reaching for a controller, a DTO or a
        // repository has inverted that, and the next person copies the pattern.
        ArchRule rule = noClasses()
                .that().resideInAPackage("..domain..")
                .should().dependOnClassesThat().resideInAnyPackage("..dto..", "..platform..");

        rule.check(CLASSES);
    }

    @Test
    void featuresDoNotReachIntoAnotherFeaturesDomain() {
        // Cross-feature access goes through that feature's service, never straight at its
        // entities. This is the rule that keeps the modules separable later.
        ArchRule rule = noClasses()
                .that().resideInAPackage("com.ridex.auth..")
                .should().dependOnClassesThat().resideInAnyPackage(
                        "com.ridex.trip.domain..",
                        "com.ridex.payment.domain..",
                        "com.ridex.dispatch.domain..");

        rule.check(CLASSES);
    }
}
